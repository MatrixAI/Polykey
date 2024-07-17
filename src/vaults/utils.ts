import type { EncryptedFS, Stat } from 'encryptedfs';
import type { FileSystem } from '../types';
import type {
  VaultRef,
  VaultAction,
  CommitId,
  FileSystemReadable,
  FileSystemWritable,
  TreeNode,
  DirectoryNode,
  INode,
  StatEncoded,
} from './types';
import type { NodeId } from '../ids/types';
import type { Path } from 'encryptedfs/dist/types';
import path from 'path';
import { minimatch } from 'minimatch';
import { pathJoin } from 'encryptedfs/dist/utils';
import * as vaultsErrors from './errors';
import { tagLast, refs, vaultActions } from './types';
import * as nodesUtils from '../nodes/utils';
import * as validationErrors from '../validation/errors';

/**
 * Vault history is designed for linear-history
 * The canonical branch represents the one and only true timeline
 * In the future, we can introduce non-linear history
 * Where branches are automatically made when new timelines are created
 */
const canonicalBranch = 'master';
const canonicalBranchRef = 'refs/heads/' + canonicalBranch;

/**
 * Vault reference can be HEAD, any of the special tags or a commit ID
 */
function validateRef(ref: any): ref is VaultRef {
  return refs.includes(ref) || validateCommitId(ref);
}

function assertRef(ref: any): asserts ref is VaultRef {
  if (!validateRef(ref)) {
    throw new vaultsErrors.ErrorVaultReferenceInvalid();
  }
}

/**
 * Commit ids are SHA1 hashes encoded as 40-character long lowercase hexadecimal strings
 */
function validateCommitId(commitId: any): commitId is CommitId {
  return /^[a-f0-9]{40}$/.test(commitId);
}

function commitAuthor(nodeId: NodeId): { name: string; email: string } {
  return {
    name: nodesUtils.encodeNodeId(nodeId),
    email: '',
  };
}

async function* readDirRecursively(
  fs,
  dir = '.',
): AsyncGenerator<string, void, void> {
  const dirEntries = await fs.promises.readdir(dir);
  for (const dirEntry of dirEntries) {
    const res = path.join(dir, dirEntry.toString());
    const stat = await fs.promises.stat(res);
    if (stat.isDirectory()) {
      yield* readDirRecursively(fs, res);
    } else if (stat.isFile()) {
      yield res;
    }
  }
}

async function* walkFs(
  efs: FileSystemReadable,
  path: string = '.',
): AsyncGenerator<string, undefined, undefined> {
  const shortList: Array<string> = [path];
  let path_: Path | undefined = undefined;
  while ((path_ = shortList.shift()) != null) {
    const pathStat = await efs.stat(path_);
    if (pathStat.isDirectory()) {
      // Push contents to shortlist
      const newPaths = await efs.readdir(path_);
      shortList.push(
        ...newPaths.map((v) => pathJoin(path_!.toString(), v.toString())),
      );
    } else {
      // Is a file so we yield the path
      yield path_;
    }
  }
}

function isVaultAction(action: any): action is VaultAction {
  if (typeof action !== 'string') return false;
  return (vaultActions as Readonly<Array<string>>).includes(action);
}

function parseVaultAction(data: any): VaultAction {
  if (!isVaultAction(data)) {
    throw new validationErrors.ErrorParse(
      'Vault action must be `clone` or `pull`',
    );
  }
  return data;
}

async function deleteObject(fs: EncryptedFS, gitdir: string, ref: string) {
  const bucket = ref.slice(0, 2);
  const shortRef = ref.slice(2);
  const objectPath = path.join(gitdir, 'objects', bucket, shortRef);
  try {
    await fs.unlink(objectPath);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

async function mkdirExists(efs: FileSystemWritable, directory: string) {
  try {
    await efs.mkdir(directory, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
}

function genStat(stat: Stat): StatEncoded {
  return {
    isSymbolicLink: stat.isSymbolicLink(),
    type: stat.isFile() ? 'FILE' : stat.isDirectory() ? 'DIRECTORY' : 'OTHER',
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    uid: stat.uid,
    gid: stat.gid,
    rdev: stat.rdev,
    size: stat.size,
    blksize: stat.blksize,
    blocks: stat.blocks,
    atime: stat.atime.getTime(),
    mtime: stat.mtime.getTime(),
    ctime: stat.ctime.getTime(),
    birthtime: stat.birthtime.getTime(),
  };
}

/**
 * This is a utility for walking a file tree while matching a file path globstar pattern.
 * @param fs - file system to work against, supports nodes `fs` and our `FileSystemReadable` provided by vaults.
 * @param basePath - The path to start walking from.
 * @param pattern - The pattern to match against, defaults to everything
 * @param yieldRoot - toggles yielding details of the basePath. Defaults to true.
 * @param yieldParents - Toggles yielding details about parents of pattern matched paths. Defaults to false.
 * @param yieldDirectories - Toggles yielding directories that match the pattern. Defaults to true.
 * @param yieldFiles - Toggles yielding files that match the pattern. Defaults to true.
 * @param yieldStats - Toggles including stats in file and directory details. Defaults to false.
 */
async function* globWalk({
  fs,
  basePath = '.',
  pattern = '**/*',
  yieldRoot = true,
  yieldParents = false,
  yieldDirectories = true,
  yieldFiles = true,
  yieldStats = false,
}: {
  fs: FileSystem | FileSystemReadable;
  basePath?: string;
  pattern?: string;
  yieldRoot?: boolean;
  yieldParents?: boolean;
  yieldDirectories?: boolean;
  yieldFiles?: boolean;
  yieldStats?: boolean;
}): AsyncGenerator<TreeNode, void, void> {
  const files: Array<string> = [];
  const directoryMap: Map<number, DirectoryNode> = new Map();
  // Path, node, parent
  const queue: Array<[string, INode, INode]> = [];
  let iNode = 1;
  const basePathNormalised = path.normalize(basePath);
  let current: [string, INode, INode] | undefined = [basePathNormalised, 1, 0];

  const getParents = (parentINode: INode) => {
    const parents: Array<DirectoryNode> = [];
    let currentParent = parentINode;
    while (true) {
      const directory = directoryMap.get(currentParent);
      directoryMap.delete(currentParent);
      if (directory == null) break;
      parents.unshift(directory);
      currentParent = directory.parent;
    }
    return parents;
  };

  // Iterate over tree
  const patternPath = path.join(basePathNormalised, pattern);
  while (current != null) {
    const [currentPath, node, parentINode] = current;

    const stat = await fs.promises.stat(currentPath);
    if (stat.isDirectory()) {
      // `.` and `./` will not partially match the pattern, so we exclude the initial path
      if (
        !minimatch(currentPath, patternPath, { partial: true }) &&
        currentPath !== basePathNormalised
      ) {
        current = queue.shift();
        continue;
      }
      // @ts-ignore: While the types don't fully match, it matches enough for our usage.
      const childrenPaths = await fs.promises.readdir(currentPath);
      const children = childrenPaths.map(
        (v) =>
          [path.join(currentPath!, v.toString()), ++iNode, node] as [
            string,
            INode,
            INode,
          ],
      );
      queue.push(...children);
      // Only yield root if we specify it
      if (yieldRoot || node !== 1) {
        directoryMap.set(node, {
          type: 'directory',
          path: currentPath,
          iNode: node,
          parent: parentINode,
          children: children.map((v) => v[1]),
          stat: yieldStats ? genStat(stat) : undefined,
        });
      }
      // Wildcards can find directories so we need yield them too
      if (minimatch(currentPath, patternPath)) {
        // Remove current from parent list
        directoryMap.delete(node);
        // Yield parents
        if (yieldParents) {
          for (const parent of getParents(parentINode)) yield parent;
        }
        // Yield directory
        if (yieldDirectories) {
          yield {
            type: 'directory',
            path: currentPath,
            iNode: node,
            parent: parentINode,
            children: children.map((v) => v[1]),
            stat: yieldStats ? genStat(stat) : undefined,
          };
        }
      }
    } else if (stat.isFile()) {
      if (!minimatch(currentPath, patternPath)) {
        current = queue.shift();
        continue;
      }
      // Get the directories in order
      if (yieldParents) {
        for (const parent of getParents(parentINode)) yield parent;
      }
      // Yield file.
      if (yieldFiles) {
        yield {
          type: 'file',
          path: currentPath,
          iNode: node,
          parent: parentINode,
          cNode: files.length,
          stat: yieldStats ? genStat(stat) : undefined,
        };
      }
      files.push(currentPath);
    }
    current = queue.shift();
  }
}

export {
  tagLast,
  refs,
  canonicalBranch,
  canonicalBranchRef,
  validateRef,
  assertRef,
  validateCommitId,
  commitAuthor,
  isVaultAction,
  parseVaultAction,
  readDirRecursively,
  walkFs,
  deleteObject,
  mkdirExists,
  globWalk,
};

export { createVaultIdGenerator, encodeVaultId, decodeVaultId } from '../ids';
