import type VaultInternal from './VaultInternal';
import type Vault from './Vault';
import type { Opaque } from '../types';
import type { NodeId } from '@/nodes/types';
import type { MutexInterface } from 'async-mutex';
import type { Callback, Path } from 'encryptedfs/dist/types';
import type { FdIndex } from 'encryptedfs/dist/fd/types';
import { EncryptedFS, permissions } from 'encryptedfs';

/**
 * Randomly generated vault ID for each new vault
 */
type VaultId = Opaque<'VaultId', string>;

/**
 * Actions relating to what is possible with vaults
 */
type VaultAction = 'clone' | 'pull';

type VaultKey = Buffer;

type VaultName = string;

type VaultList = string[];

type SecretName = string;

type SecretList = string[];

/**
 * Map vaultId -> Vault
 */
type Vaults = {
  [vaultId: string]: Vault;
};

type VaultMap = Map<VaultName, {
  vault?: VaultInternal;
  lock: MutexInterface;
}>;

type VaultPermissions = Record<NodeId, VaultAction>;

type FileChange = {
  fileName: string;
  action: 'added' | 'modified' | 'removed';
};

type FileChanges = Array<FileChange>;

type FileOptions = {
  recursive?: boolean;
};

type VaultMapOp_ =
  | {
      domain: 'vaults';
      key: VaultId;
      value: Buffer;
    }
  | {
      domain: 'names';
      key: string;
      value: VaultId;
    }
  | {
      domain: 'links';
      key: VaultId;
      value: string;
    };

type VaultMapOp =
  | ({
      type: 'put';
    } & VaultMapOp_)
  | ({
      type: 'del';
    } & Omit<VaultMapOp_, 'value'>);

type VaultActions = Partial<Record<VaultAction, null>>;

interface FileSystemReadable {
  chdir: typeof EncryptedFS.prototype.chdir,
  access: typeof EncryptedFS.prototype.access,
  chmod: typeof EncryptedFS.prototype.chmod,
  chown: typeof EncryptedFS.prototype.chown,
  chownr: typeof EncryptedFS.prototype.chownr,
  close: typeof EncryptedFS.prototype.close,
  createReadStream: typeof EncryptedFS.prototype.createReadStream,
  exists: typeof EncryptedFS.prototype.exists,
  fchmod: typeof EncryptedFS.prototype.fchmod,
  fchown: typeof EncryptedFS.prototype.fchown,
  fstat: typeof EncryptedFS.prototype.fstat,
  futimes: typeof EncryptedFS.prototype.futimes,
  lchmod: typeof EncryptedFS.prototype.lchmod,
  lchown: typeof EncryptedFS.prototype.lchown,
  lseek: typeof EncryptedFS.prototype.lseek,
  lstat: typeof EncryptedFS.prototype.lstat,
  open(
    path: Path,
    flags: 'r' | 'rs' | 'r+' | 'rs+',
    mode?: number,
  ): Promise<FdIndex>,
  open(
    path: Path,
    flags: 'r' | 'rs' | 'r+' | 'rs+',
    callback: Callback<[FdIndex]>,
  ): Promise<void>;
  open(
    path: Path,
    flags: 'r' | 'rs' | 'r+' | 'rs+',
    mode: number,
    callback: Callback<[FdIndex]>,
  ): Promise<void>;
  read: typeof EncryptedFS.prototype.read,
  readdir: typeof EncryptedFS.prototype.readdir,
  readFile: typeof EncryptedFS.prototype.readFile,
  readlink: typeof EncryptedFS.prototype.readlink,
  realpath: typeof EncryptedFS.prototype.realpath,
  stat: typeof EncryptedFS.prototype.stat,
  utimes: typeof EncryptedFS.prototype.utimes,
}

interface FileSystemWritable {
  chdir: typeof EncryptedFS.prototype.chdir,
  access: typeof EncryptedFS.prototype.access,
  appendFile: typeof EncryptedFS.prototype.appendFile,
  chmod: typeof EncryptedFS.prototype.chmod,
  chown: typeof EncryptedFS.prototype.chown,
  chownr: typeof EncryptedFS.prototype.chownr,
  close: typeof EncryptedFS.prototype.close,
  copyFile: typeof EncryptedFS.prototype.copyFile,
  createWriteStream: typeof EncryptedFS.prototype.createWriteStream,
  fallocate: typeof EncryptedFS.prototype.fallocate,
  fchmod: typeof EncryptedFS.prototype.fchmod,
  fchown: typeof EncryptedFS.prototype.fchown,
  ftruncate: typeof EncryptedFS.prototype.ftruncate,
  futimes: typeof EncryptedFS.prototype.futimes,
  lchmod: typeof EncryptedFS.prototype.lchmod,
  lchown: typeof EncryptedFS.prototype.lchown,
  link: typeof EncryptedFS.prototype.link,
  lseek: typeof EncryptedFS.prototype.lseek,
  mkdir: typeof EncryptedFS.prototype.mkdir,
  mkdirp: typeof EncryptedFS.prototype.mkdirp,
  mkdtemp: typeof EncryptedFS.prototype.mkdtemp,
  mknod: typeof EncryptedFS.prototype.mknod,
  open: typeof EncryptedFS.prototype.open,
  rename: typeof EncryptedFS.prototype.rename,
  rmdir: typeof EncryptedFS.prototype.rmdir,
  symlink: typeof EncryptedFS.prototype.symlink,
  truncate: typeof EncryptedFS.prototype.truncate,
  unlink: typeof EncryptedFS.prototype.unlink,
  utimes: typeof EncryptedFS.prototype.utimes,
  write: typeof EncryptedFS.prototype.write,
  writeFile: typeof EncryptedFS.prototype.writeFile,
}

export type {
  VaultId,
  VaultAction,
  VaultKey,
  VaultName,
  VaultList,
  VaultMap,
  Vaults,
  VaultPermissions,
  FileChange,
  FileChanges,
  VaultMapOp,
  VaultActions,
  SecretName,
  SecretList,
  FileOptions,
  FileSystemReadable,
  FileSystemWritable,
};
