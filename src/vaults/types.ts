import type { VaultId, VaultIdString, VaultIdEncoded } from '../ids/types';
import type { EncryptedFS } from 'encryptedfs';
import type { Callback, Path } from 'encryptedfs/dist/types';
import type { FdIndex } from 'encryptedfs/dist/fd/types';
import type { Opaque } from '../types';

const vaultActions = ['clone', 'pull'] as const;

type VaultAction = (typeof vaultActions)[number];

/**
 * Special tags that are managed by VaultInternal
 * They are used to refer to specific commits
 * These may or may not be implemented using Git tags
 */
const tagLast = 'last';

/**
 * Tuple of static references
 */
const refs = ['HEAD', tagLast] as const;

type VaultRef = (typeof refs)[number];

type CommitId = Opaque<'CommitId', string>;

type CommitLog = {
  commitId: CommitId;
  parent: Array<CommitId>;
  author: {
    name: string;
    timestamp: Date;
  };
  committer: {
    name: string;
    timestamp: Date;
  };
  message: string;
};

/**
 * Readonly-only interface for EncryptedFS
 * Note that open flags type are not complete
 * Combinations of the flags can be used as well
 */
interface FileSystemReadable {
  constants: EncryptedFS['constants'];
  promises: FileSystemReadable;
  access: EncryptedFS['access'];
  close: EncryptedFS['close'];
  createReadStream: EncryptedFS['createReadStream'];
  exists: EncryptedFS['exists'];
  fstat: EncryptedFS['fstat'];
  lseek: EncryptedFS['lseek'];
  lstat: EncryptedFS['lstat'];
  open(
    path: Path,
    flags:
      | 'r'
      | EncryptedFS['constants']['O_RDONLY']
      | EncryptedFS['constants']['O_DIRECTORY']
      | EncryptedFS['constants']['O_NOATIME']
      | EncryptedFS['constants']['O_DIRECT']
      | EncryptedFS['constants']['O_NONBLOCK'],
    mode?: number,
  ): Promise<FdIndex>;
  open(
    path: Path,
    flags:
      | 'r'
      | EncryptedFS['constants']['O_RDONLY']
      | EncryptedFS['constants']['O_DIRECTORY']
      | EncryptedFS['constants']['O_NOATIME']
      | EncryptedFS['constants']['O_DIRECT']
      | EncryptedFS['constants']['O_NONBLOCK'],
    callback: Callback<[FdIndex]>,
  ): Promise<void>;
  open(
    path: Path,
    flags:
      | 'r'
      | EncryptedFS['constants']['O_RDONLY']
      | EncryptedFS['constants']['O_DIRECTORY']
      | EncryptedFS['constants']['O_NOATIME']
      | EncryptedFS['constants']['O_DIRECT']
      | EncryptedFS['constants']['O_NONBLOCK'],
    mode: number,
    callback: Callback<[FdIndex]>,
  ): Promise<void>;
  read: EncryptedFS['read'];
  readdir: EncryptedFS['readdir'];
  readFile: EncryptedFS['readFile'];
  readlink: EncryptedFS['readlink'];
  realpath: EncryptedFS['realpath'];
  stat: EncryptedFS['stat'];
}

/**
 * Readable & Writable interface for EncryptedFS
 */
interface FileSystemWritable extends FileSystemReadable {
  promises: FileSystemWritable;
  appendFile: EncryptedFS['appendFile'];
  chmod: EncryptedFS['chmod'];
  chown: EncryptedFS['chown'];
  chownr: EncryptedFS['chownr'];
  copyFile: EncryptedFS['copyFile'];
  createWriteStream: EncryptedFS['createWriteStream'];
  fallocate: EncryptedFS['fallocate'];
  fchmod: EncryptedFS['fchmod'];
  fchown: EncryptedFS['fchown'];
  fdatasync: EncryptedFS['fdatasync'];
  fsync: EncryptedFS['fsync'];
  ftruncate: EncryptedFS['ftruncate'];
  futimes: EncryptedFS['futimes'];
  lchmod: EncryptedFS['lchmod'];
  lchown: EncryptedFS['lchown'];
  link: EncryptedFS['link'];
  mkdir: EncryptedFS['mkdir'];
  mkdtemp: EncryptedFS['mkdtemp'];
  mknod: EncryptedFS['mknod'];
  open: EncryptedFS['open'];
  rename: EncryptedFS['rename'];
  rmdir: EncryptedFS['rmdir'];
  symlink: EncryptedFS['symlink'];
  truncate: EncryptedFS['truncate'];
  unlink: EncryptedFS['unlink'];
  utimes: EncryptedFS['utimes'];
  write: EncryptedFS['write'];
  writeFile: EncryptedFS['writeFile'];
}

type VaultName = string;

type VaultActions = Partial<Record<VaultAction, null>>;

export { vaultActions };

export type {
  VaultId,
  VaultIdEncoded,
  VaultIdString,
  VaultRef,
  VaultAction,
  CommitId,
  CommitLog,
  FileSystemReadable,
  FileSystemWritable,
  VaultName,
  VaultActions,
};

export { tagLast, refs };
