import type fs from 'fs';

/**
 * Plain data dictionary
 */
type POJO = { [key: string]: any };

type Opaque<K, T> = T & { __TYPE__: K };

type AbstractConstructorParameters<T> = ConstructorParameters<
  (new (...args: any) => any) & T
>;

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

export {
  Opaque,
  POJO,
  AbstractConstructorParameters,
  Timer,
  FileSystem,
  LockConfig,
};
