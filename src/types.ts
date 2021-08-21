import type fs from 'fs';

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
