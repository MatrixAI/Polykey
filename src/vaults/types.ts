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

type FileTree = Array<TreeNode>;
type TreeNode = {
  type: 'DIRECTORY' | 'FILE';
  iNode: INode;
  path: FilePath;
  parent: INode;
  stat?: StatEncoded;
};

type ContentNode = {
  type: 'CONTENT';
  iNode: number;
  dataSize: bigint;
};
type DoneMessage = { type: 'DONE' };

type FilePath = string;
type INode = number;

type StatEncoded = {
  isSymbolicLink: boolean;
  dev: number;
  ino: number;
  mode: number;
  nlink: number;
  uid: number;
  gid: number;
  rdev: number;
  size: number;
  blksize: number;
  blocks: number;
  atime: number;
  mtime: number;
  ctime: number;
  birthtime: number;
};

interface Parsed<T> {
  data?: T;
  remainder: Uint8Array;
}

type HeaderGeneric = {
  type: HeaderType;
};
type HeaderContent = {
  dataSize: bigint;
  iNode: number;
};

enum HeaderSize {
  GENERIC = 2,
  CONTENT = 13,
}

enum HeaderType {
  CONTENT = 0x43, // 'C' 67
  TREE = 0x54, // 'T' 84
}

enum HeaderMagic {
  START = 0x48, // 'H' 72
  END = 0x44, // 'D' 68
}

export {};

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
  FileTree,
  TreeNode,
  ContentNode,
  DoneMessage,
  FilePath,
  INode,
  StatEncoded,
  Parsed,
  HeaderGeneric,
  HeaderContent,
};

export { vaultActions, tagLast, refs, HeaderSize, HeaderType, HeaderMagic };
