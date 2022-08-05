import type {
  VaultId,
  VaultIdEncoded,
  VaultRef,
  VaultAction,
  CommitId,
} from './types';
import type { NodeId } from '../nodes/types';
import type { EncryptedFS } from 'encryptedfs';
import path from 'path';
import { IdInternal, IdRandom } from '@matrixai/id';
import { tagLast, refs, vaultActions } from './types';
import * as nodesUtils from '../nodes/utils';

/**
 * Vault history is designed for linear-history
 * The canonical branch represents the one and only true timeline
 * In the future, we can introduce non-linear history
 * Where branches are automatically made when new timelines are created
 */
const canonicalBranch = 'master';
const canonicalBranchRef = 'refs/heads/' + canonicalBranch;

const vaultIdGenerator = new IdRandom<VaultId>();

function generateVaultId(): VaultId {
  return vaultIdGenerator.get();
}

function encodeVaultId(vaultId: VaultId): VaultIdEncoded {
  return vaultId.toMultibase('base58btc') as VaultIdEncoded;
}

function decodeVaultId(vaultIdEncoded: any): VaultId | undefined {
  if (typeof vaultIdEncoded !== 'string') return;
  const vaultId = IdInternal.fromMultibase<VaultId>(vaultIdEncoded);
  if (vaultId == null) return;
  // All VaultIds are 16 bytes long
  if (vaultId.length !== 16) return;
  return vaultId;
}

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

async function* readdirRecursively(fs, dir = '.') {
  const dirents = await fs.promises.readdir(dir);
  for (const dirent of dirents) {
    const res = path.join(dir, dirent.toString());
    const stat = await fs.promises.stat(res);
    if (stat.isDirectory()) {
      yield* readdirRecursively(fs, res);
    } else if (stat.isFile()) {
      yield res;
    }
  }
}

function isVaultAction(action: any): action is VaultAction {
  if (typeof action !== 'string') return false;
  return (vaultActions as Readonly<Array<string>>).includes(action);
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
  generateVaultId,
  encodeVaultId,
  decodeVaultId,
  validateRef,
  validateCommitId,
  commitAuthor,
  isVaultAction,
  readdirRecursively,
  deleteObject,
};
