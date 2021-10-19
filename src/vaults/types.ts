import type VaultInternal from './VaultInternal';
import type { Opaque } from '../types';
import type { NodeId } from '@/nodes/types';
import type { MutexInterface } from 'async-mutex';
import type { Callback, Path } from 'encryptedfs/dist/types';
import type { FdIndex } from 'encryptedfs/dist/fd/types';
import { EncryptedFS, permissions } from 'encryptedfs';
import { Id, IdString } from '../GenericIdTypes';

/**
 * Randomly generated vault ID for each new vault
 */
type VaultId = Opaque<'VaultId', Id>;

type VaultIdPretty = Opaque<'VaultIdPretty', IdString>;

type VaultName = Opaque<'VaultName', string>;

type VaultKey = Opaque<'VaultKey', Buffer>;


/**
 * Actions relating to what is possible with vaults
 */
type VaultAction = 'clone' | 'pull';

type VaultList = Map<VaultName, VaultId>;

type VaultMetadata = {
  name: VaultName;
}

type SecretName = string;

type SecretList = string[];

type SecretContent = Buffer | string;

type VaultMap = Map<string, {
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

interface FileSystemWritable extends FileSystemReadable{
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

type commitType = typeof VaultInternal.prototype.commit;
type accessType = typeof VaultInternal.prototype.access;
type logType = typeof VaultInternal.prototype.log;
type versionType = typeof VaultInternal.prototype.version;
interface Vault {
  baseDir: typeof VaultInternal.prototype.baseDir;
  gitDir: typeof VaultInternal.prototype.gitDir;
  vaultId: typeof VaultInternal.prototype.vaultId;
  commit(...arg: Parameters<commitType>): ReturnType<commitType>;
  access: accessType;
  log(...arg: Parameters<logType>): ReturnType<logType>;
  version(...arg: Parameters<versionType>): ReturnType<versionType>;
}

type CommitLog = {
  oid: string,
  committer: string,
  timeStamp: number,
  message: string,
}

export type {
  VaultId,
  VaultIdPretty,
  VaultAction,
  VaultKey,
  VaultName,
  VaultList,
  VaultMap,
  VaultMetadata,
  VaultPermissions,
  FileChange,
  FileChanges,
  VaultMapOp,
  VaultActions,
  SecretName,
  SecretList,
  SecretContent,
  FileOptions,
  FileSystemReadable,
  FileSystemWritable,
  Vault,
  CommitLog,
};
