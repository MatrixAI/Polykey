import type {
  Capability,
  DeflatedObject,
  Identity,
  PackIndex,
  RawObject,
  Refs,
  WrappedObject,
} from './types';
import type { CommitObject, TreeEntry, TreeObject } from 'isomorphic-git';
import type { EncryptedFS } from 'encryptedfs';
import type { POJO } from '../types';
import path from 'path';
import pako from 'pako';
import Hash from 'sha.js/sha1';
import git from 'isomorphic-git';
import { errors as gitErrors } from './';
import * as vaultsUtils from '../vaults/utils';
import { never } from '../utils';

async function* listReferencesGenerator(
  fs: EncryptedFS,
  dir: string = '.',
  gitDir: string,
): AsyncGenerator<[string, string], void, void> {
  const refs: Array<[string, Promise<string>]> = await git
    .listBranches({
      fs,
      dir,
      gitdir: gitDir,
    })
    .then((refs) => {
      return refs.map((ref) => {
        return [ref, git.resolveRef({ fs, dir, gitdir: gitDir, ref: ref })];
      });
    });
  // HEAD always comes first
  const headRef = 'HEAD';
  const resolvedHead = await git.resolveRef({
    fs,
    dir,
    gitdir: gitDir,
    ref: headRef,
  });
  yield [headRef, resolvedHead];
  for (const [key, refP] of refs) {
    yield [key, await refP];
  }
}

/**
 * Reads the provided reference and formats it as a `symref` capability
 */
async function refCapability(
  fs: EncryptedFS,
  dir: string = '.',
  gitDir: string,
  ref: string,
): Promise<Capability> {
  try {
    const resolvedHead = await git.resolveRef({
      fs,
      dir,
      gitdir: gitDir,
      ref,
      depth: 2,
    });
    return `symref=${ref}:${resolvedHead}`;
  } catch (e) {
    if (e.code === 'ENOENT') throw e;
    return '';
  }
}

/**
 * Walks the git objects and returns a list of blobs, commits and trees.
 */
async function listObjects({
  fs,
  dir = '.',
  gitdir = '.git',
  wants,
  haves,
}: {
  fs: EncryptedFS;
  dir: string;
  gitdir: string;
  wants: string[];
  haves: string[];
}): Promise<Array<string>> {
  const commits = new Set<string>();
  const trees = new Set<string>();
  const blobs = new Set<string>();
  const tags = new Set<string>();
  const havesSet: Set<string> = new Set(haves);

  async function walk(
    objectId: string,
    type: 'blob' | 'tree' | 'commit' | 'tag',
  ): Promise<void> {
    // If object was listed as a have then we don't need to walk over it
    if (havesSet.has(objectId)) return;
    switch (type) {
      case 'commit':
        {
          commits.add(objectId);
          const readCommitResult = await git.readCommit({
            fs,
            dir,
            gitdir,
            oid: objectId,
          });
          const tree = readCommitResult.commit.tree;
          await walk(tree, 'tree');
        }
        return;
      case 'tree':
        {
          trees.add(objectId);
          const readTreeResult = await git.readTree({
            fs,
            dir,
            gitdir,
            oid: objectId,
          });
          const walkPs: Array<Promise<void>> = [];
          for (const { oid, type } of readTreeResult.tree) {
            walkPs.push(walk(oid, type));
          }
          await Promise.all(walkPs);
        }
        return;
      case 'blob':
        {
          blobs.add(objectId);
        }
        return;
      case 'tag':
        {
          tags.add(objectId);
          const readTagResult = await git.readTag({
            fs,
            dir,
            gitdir,
            oid: objectId,
          });
          const { object, type } = readTagResult.tag;
          await walk(object, type);
        }
        return;
      default:
        never();
    }
  }

  // Let's go walking!
  const walkPs: Array<Promise<void>> = [];
  for (const oid of wants) {
    walkPs.push(walk(oid, 'commit'));
  }
  await Promise.all(walkPs);
  return [...commits, ...trees, ...blobs, ...tags];
}

export { listReferencesGenerator, refCapability, listObjects };
