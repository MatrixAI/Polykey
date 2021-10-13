import type fs from 'fs';
import { VaultId, VaultIdRaw } from "@/vaults/types";
import { utils as idUtils } from "@matrixai/id";
import { errors as vaultErrors } from "@/vaults";

/**
 * Plain data dictionary
 */
type POJO = { [key: string]: any };

/**
 * Opaque types are wrappers of existing types
 * that require smart constructors
 */
type Opaque<K, T> = T & { __TYPE__: K };

/**
 * Any type that can be turned into a string
 */
interface ToString {
  toString(): string;
}

/**
 * Allows extension of constructors that use POJOs
 */
type AbstractConstructorParameters<T> = ConstructorParameters<
  (new (...args: any) => any) & T
>;

/**
 * Wrap a type to be reference counted
 * Useful for when we need to garbage collect data
 */
type Ref<T> = {
  count: number;
  object: T;
};

/**
 * Use Timer to control timers
 */
type Timer = {
  timer: ReturnType<typeof setTimeout>;
  timedOut: boolean;
  timerP: Promise<void>;
};

/**
 * Minimal filesystem type
 * Based on the required operations from fs/promises
 * Implement this with platform-specific filesystem
 */
interface FileSystem {
  promises: {
    rm: typeof fs.promises.rm;
    stat: typeof fs.promises.stat;
    readFile: typeof fs.promises.readFile;
    writeFile: typeof fs.promises.writeFile;
    copyFile: typeof fs.promises.copyFile;
    mkdir: typeof fs.promises.mkdir;
    readdir: typeof fs.promises.readdir;
    rename: typeof fs.promises.rename;
    open: typeof fs.promises.open;
  };
}

type LockConfig = {
  pid: number;
  nodeId: string;
  clientHost?: string;
  clientPort?: number | undefined;
} & POJO;

type Initial<T extends any[]> = T extends [...infer Head, any] ? Head : any[];
type InitialParameters<T extends (...args: any) => any> = Initial<
  Parameters<T>
>;

// Type guards for generic RandomId types.

type RawRandomId = Buffer;
type RandomId = string;
const RawRandomIdLength = 16;

function isRawRandomId<T extends RawRandomId>(arg: any): arg is T {
  if (!( arg instanceof Buffer)) return false;
  return arg.length === RawRandomIdLength;
}

/**
 * This will return arg as a valid VaultId or throw an error if it can't be converted.
 * This will take a multibase string of the ID or the raw Buffer of the ID.
 * @param arg - The variable we wish to convert
 * @throws vaultErrors.ErrorInvalidVaultId  if the arg can't be converted into a VaultId
 * @returns VaultIdRaw
 */
function makeRawRandomId<T extends Buffer>(arg: any): T {
  let id = arg;
  // Checking and converting a string
  if (typeof arg === 'string'){
    // Covert the string to the Buffer form.
    id = idUtils.fromMultibase(arg);
    if (id == null) throw new vaultErrors.ErrorInvalidVaultId(); // FIXME
    id = Buffer.from(id);
  }

  // checking if valid buffer.
  if (isRawRandomId<T>(id)) return id;
  throw new vaultErrors.ErrorInvalidVaultId(); // FIXME
}

function isRandomId<T extends RandomId>(arg: any): arg is T {
  if (typeof arg !== 'string') return false;
  let id = idUtils.fromMultibase(arg);
  if (id == null) return false;
  return Buffer.from(id).length === RawRandomIdLength;
}

function makeRandomId<T extends RandomId>(arg: any): T {
  let id = arg;
  if ((id instanceof Buffer)) {
    id = idUtils.toMultibase(arg, 'base58btc');
  }
  if(isRandomId<T>(id)) return id;
  throw new vaultErrors.ErrorInvalidVaultId(); // FIXME
}

export {
  POJO,
  Opaque,
  ToString,
  AbstractConstructorParameters,
  Ref,
  Timer,
  FileSystem,
  LockConfig,
  Initial,
  InitialParameters,
};
