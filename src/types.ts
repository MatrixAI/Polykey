// eslint-disable-next-line no-restricted-imports -- Interim types for FileSystem
import type fs from 'fs';

/**
 * Plain data dictionary
 */
type POJO = { [key: string]: any };

/**
 * Opaque types are wrappers of existing types
 * that require smart constructors
 */
type Opaque<K, T> = T & { readonly [brand]: K };
declare const brand: unique symbol;

/**
 * Non-empty array
 */
type NonEmptyArray<T> = [T, ...T[]];

/**
 * Allows extension of constructors that use POJOs
 */
type AbstractConstructorParameters<T> = ConstructorParameters<
  (new (...args: any) => any) & T
>;

type Initial<T extends any[]> = T extends [...infer Head, any] ? Head : any[];
type InitialParameters<T extends (...args: any) => any> = Initial<
  Parameters<T>
>;

/**
 * Any type that can be turned into a string
 */
interface ToString {
  toString(): string;
}

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
    rmdir: typeof fs.promises.rmdir;
    stat: typeof fs.promises.stat;
    readFile: typeof fs.promises.readFile;
    writeFile: typeof fs.promises.writeFile;
    copyFile: typeof fs.promises.copyFile;
    mkdir: typeof fs.promises.mkdir;
    readdir: typeof fs.promises.readdir;
    rename: typeof fs.promises.rename;
    open: typeof fs.promises.open;
  };
  constants: typeof fs.constants;
}

type FileHandle = fs.promises.FileHandle;

export type {
  POJO,
  Opaque,
  NonEmptyArray,
  AbstractConstructorParameters,
  Initial,
  InitialParameters,
  ToString,
  Ref,
  Timer,
  FileSystem,
  FileHandle,
};
