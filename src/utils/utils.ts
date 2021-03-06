import type { FileSystem, Timer, Callback } from '../types';
import os from 'os';
import process from 'process';
import path from 'path';
import * as utilsErrors from './errors';

function getDefaultNodePath(): string | undefined {
  const prefix = 'polykey';
  const platform = os.platform();
  let p: string;
  if (platform === 'linux') {
    const homeDir = os.homedir();
    const dataDir = process.env.XDG_DATA_HOME;
    if (dataDir != null) {
      p = `${dataDir}/${prefix}`;
    } else {
      p = `${homeDir}/.local/share/${prefix}`;
    }
  } else if (platform === 'darwin') {
    const homeDir = os.homedir();
    p = `${homeDir}/Library/Application Support/${prefix}`;
  } else if (platform === 'win32') {
    const homeDir = os.homedir();
    const appDataDir = process.env.LOCALAPPDATA;
    if (appDataDir != null) {
      p = `${appDataDir}/${prefix}`;
    } else {
      p = `${homeDir}/AppData/Local/${prefix}`;
    }
  } else {
    return;
  }
  return p;
}

function never(): never {
  throw new utilsErrors.ErrorUtilsUndefinedBehaviour();
}

async function mkdirExists(fs: FileSystem, path, ...args) {
  try {
    return await fs.promises.mkdir(path, ...args);
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
}

/**
 * Checks if a directory is empty
 * If the path does not exist, also returns true
 */
async function dirEmpty(fs: FileSystem, path): Promise<boolean> {
  try {
    const entries = await fs.promises.readdir(path);
    return entries.length === 0;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false;
    }
    throw e;
  }
}

/**
 * Test whether a path includes another path
 * This will return true when path 1 is the same as path 2
 */
function pathIncludes(p1: string, p2: string): boolean {
  const relative = path.relative(p2, p1);
  // Absolute directory check is needed for Windows
  return (
    (relative === '' || !relative.startsWith('..')) &&
    !path.isAbsolute(relative)
  );
}

async function sleep(ms: number) {
  return await new Promise((r) => setTimeout(r, ms));
}

function isEmptyObject(o) {
  for (const k in o) return false;
  return true;
}

/**
 * Filters out all undefined properties recursively
 */
function filterEmptyObject(o) {
  return Object.fromEntries(
    Object.entries(o)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, v === Object(v) ? filterEmptyObject(v) : v]),
  );
}

function getUnixtime(date: Date = new Date()) {
  return Math.round(date.getTime() / 1000);
}

/**
 * Poll execution and use condition to accept or reject the results
 */
async function poll<T, E = any>(
  f: () => Promise<T>,
  condition: {
    (e: E, result?: undefined): boolean;
    (e: null, result: T): boolean;
  },
  interval = 1000,
  timeout?: number,
): Promise<T> {
  const timer = timeout != null ? timerStart(timeout) : undefined;
  try {
    let result: T;
    while (true) {
      if (timer?.timedOut) {
        throw new utilsErrors.ErrorUtilsPollTimeout();
      }
      try {
        result = await f();
        if (condition(null, result)) {
          return result;
        }
      } catch (e) {
        if (condition(e)) {
          throw e;
        }
      }
      await sleep(interval);
    }
  } finally {
    if (timer != null) timerStop(timer);
  }
}

/**
 * Convert callback-style to promise-style
 * If this is applied to overloaded function
 * it will only choose one of the function signatures to use
 */
function promisify<
  T extends Array<unknown>,
  P extends Array<unknown>,
  R extends T extends [] ? void : T extends [unknown] ? T[0] : T,
>(
  f: (...args: [...params: P, callback: Callback<T>]) => unknown,
): (...params: P) => Promise<R> {
  // Uses a regular function so that `this` can be bound
  return function (...params: P): Promise<R> {
    return new Promise((resolve, reject) => {
      const callback = (error, ...values) => {
        if (error != null) {
          return reject(error);
        }
        if (values.length === 0) {
          (resolve as () => void)();
        } else if (values.length === 1) {
          resolve(values[0] as R);
        } else {
          resolve(values as R);
        }
        return;
      };
      params.push(callback);
      f.apply(this, params);
    });
  };
}

type PromiseDeconstructed<T> = {
  p: Promise<T>;
  resolveP: (value: T | PromiseLike<T>) => void;
  rejectP: (reason?: any) => void;
};

/**
 * Deconstructed promise
 */
function promise<T = void>(): PromiseDeconstructed<T> {
  let resolveP, rejectP;
  const p = new Promise<T>((resolve, reject) => {
    resolveP = resolve;
    rejectP = reject;
  });
  return {
    p,
    resolveP,
    rejectP,
  };
}

function timerStart(timeout: number): Timer {
  const timer = {} as Timer;
  timer.timedOut = false;
  timer.timerP = new Promise<void>((resolve) => {
    timer.timer = setTimeout(() => {
      timer.timedOut = true;
      resolve();
    }, timeout);
  });
  return timer;
}

function timerStop(timer: Timer): void {
  clearTimeout(timer.timer);
}

function arraySet<T>(items: Array<T>, item: T) {
  if (items.indexOf(item) === -1) {
    items.push(item);
  }
}

function arrayUnset<T>(items: Array<T>, item: T) {
  const itemIndex = items.indexOf(item);
  if (itemIndex !== -1) {
    items.splice(itemIndex, 1);
  }
}

function arrayZip<T1, T2>(a: Array<T1>, b: Array<T2>): Array<[T1, T2]> {
  return Array.from(Array(Math.min(b.length, a.length)), (_, i) => [
    a[i],
    b[i],
  ]);
}

function arrayZipWithPadding<T1, T2>(
  a: Array<T1>,
  b: Array<T2>,
): Array<[T1 | undefined, T2 | undefined]> {
  return Array.from(Array(Math.max(b.length, a.length)), (_, i) => [
    a[i],
    b[i],
  ]);
}

async function asyncIterableArray<T>(
  iterable: AsyncIterable<T>,
): Promise<Array<T>> {
  const arr: Array<T> = [];
  for await (const item of iterable) {
    arr.push(item);
  }
  return arr;
}

function bufferSplit(
  input: Buffer,
  delimiter?: Buffer,
  limit?: number,
  remaining: boolean = false,
): Array<Buffer> {
  const output: Array<Buffer> = [];
  let delimiterOffset = 0;
  let delimiterIndex = 0;
  let i = 0;
  if (delimiter != null) {
    while (true) {
      if (i === limit) break;
      delimiterIndex = input.indexOf(delimiter, delimiterOffset);
      if (delimiterIndex > -1) {
        output.push(input.subarray(delimiterOffset, delimiterIndex));
        delimiterOffset = delimiterIndex + delimiter.byteLength;
      } else {
        const chunk = input.subarray(delimiterOffset);
        output.push(chunk);
        delimiterOffset += chunk.byteLength;
        break;
      }
      i++;
    }
  } else {
    for (; delimiterIndex < input.byteLength; ) {
      if (i === limit) break;
      delimiterIndex++;
      const chunk = input.subarray(delimiterOffset, delimiterIndex);
      output.push(chunk);
      delimiterOffset += chunk.byteLength;
      i++;
    }
  }
  // If remaining, then the rest of the input including delimiters is extracted
  if (
    remaining &&
    limit != null &&
    output.length > 0 &&
    delimiterIndex > -1 &&
    delimiterIndex <= input.byteLength
  ) {
    const inputRemaining = input.subarray(
      delimiterIndex - output[output.length - 1].byteLength,
    );
    output[output.length - 1] = inputRemaining;
  }
  return output;
}

function debounce<P extends any[]>(
  f: (...params: P) => any,
  timeout: number = 0,
): (...param: P) => void {
  let timer: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timer);
    timer = setTimeout(() => f.apply(this, args), timeout);
  };
}

export type { PromiseDeconstructed };
export {
  getDefaultNodePath,
  never,
  mkdirExists,
  dirEmpty,
  pathIncludes,
  sleep,
  isEmptyObject,
  filterEmptyObject,
  getUnixtime,
  poll,
  promisify,
  promise,
  timerStart,
  timerStop,
  arraySet,
  arrayUnset,
  arrayZip,
  arrayZipWithPadding,
  asyncIterableArray,
  bufferSplit,
  debounce,
};
