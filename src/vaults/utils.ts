import type { EncryptedFS } from 'encryptedfs';
import type {
  VaultRef,
  VaultAction,
  CommitId,
  FileSystemReadable,
} from './types';
import type { NodeId } from '../ids/types';
import type { Path } from 'encryptedfs/dist/types';
import path from 'path';
import { pathJoin } from 'encryptedfs/dist/utils';
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

async function* readDirRecursively(fs, dir = '.') {
  const dirents = await fs.promises.readdir(dir);
  for (const dirent of dirents) {
    const res = path.join(dir, dirent.toString());
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
  const shortref = ref.slice(2);
  const objectPath = path.join(gitdir, 'objects', bucket, shortref);
  try {
    await fs.unlink(objectPath);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

export {
  tagLast,
  refs,
  canonicalBranch,
  canonicalBranchRef,
  validateRef,
  validateCommitId,
  commitAuthor,
  isVaultAction,
  parseVaultAction,
  readDirRecursively,
  walkFs,
  deleteObject,
};

export { createVaultIdGenerator, encodeVaultId, decodeVaultId } from '../ids';
