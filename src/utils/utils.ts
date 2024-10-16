import type {
  POJO,
  FileSystem,
  Timer,
  PromiseDeconstructed,
  Callback,
} from '../types';
import type { ContextTimed, ContextTimedInput } from '@matrixai/contexts';
import os from 'os';
import process from 'process';
import path from 'path';
import nodesEvents from 'events';
import lexi from 'lexicographic-integer';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { timedCancellable } from '@matrixai/contexts/dist/functions';
import * as utilsErrors from './errors';

const AsyncFunction = (async () => {}).constructor;
const GeneratorFunction = function* () {}.constructor;
const AsyncGeneratorFunction = async function* () {}.constructor;

function getDefaultNodePath(): string | undefined {
  const prefix = 'polykey';
  const platform = os.platform();
  let p: string;
  if (platform === 'linux') {
    const homeDir = os.homedir();
    const dataDir = process.env.XDG_DATA_HOME;
    if (dataDir != null) {
      p = path.join(dataDir, prefix);
    } else {
      p = path.join(homeDir, '.local', 'share', prefix);
    }
  } else if (platform === 'darwin') {
    const homeDir = os.homedir();
    p = path.join(homeDir, 'Library', 'Application Support', prefix);
  } else if (platform === 'win32') {
    const homeDir = os.homedir();
    const appDataDir = process.env.LOCALAPPDATA;
    if (appDataDir != null) {
      p = path.join(appDataDir, prefix);
    } else {
      p = path.join(homeDir, 'AppData', 'Local', prefix);
    }
  } else {
    return;
  }
  return p;
}

function never(message?: string): never {
  throw new utilsErrors.ErrorUtilsUndefinedBehaviour(message);
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
      return true;
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

async function sleep(ms: number): Promise<void> {
  return await new Promise<void>((r) => setTimeout(r, ms));
}

function sleepCancellable(ms: number): PromiseCancellable<void> {
  return new PromiseCancellable<void>((resolve, reject, signal) => {
    if (signal.aborted) return reject(signal.reason);
    const handleTimeout = () => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    };
    const handleAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    const timer = setTimeout(handleTimeout, ms);
  });
}

/**
 * Checks if value is an object.
 * Arrays are also considered objects.
 * The type guard here says `o is any`.
 * TODO: When TS 4.9.x is released, change this to `o is object`.
 * At that point `'x' in o` checks become type guards that
 * can assert the property's existence.
 */
function isObject(o: unknown): o is object {
  return o !== null && typeof o === 'object';
}

function isEmptyObject(o) {
  for (const k in o) return false;
  return true;
}

/**
 * Filters out all undefined properties recursively
 */
function filterEmptyObject(o) {
  return filterObject(o, ([_, v]) => v !== undefined).map(([k, v]) => [
    k,
    v === Object(v) ? filterEmptyObject(v) : v,
  ]);
}

function filterObject<T extends Record<K, V>, K extends string, V>(
  obj: T,
  f: (element: [K, V], index: number, arr: Array<[K, V]>) => boolean,
): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(f)) as Partial<T>;
}

/**
 * Merges an input object to a default object.
 */
function mergeObjects(object1: POJO, object2: POJO): POJO {
  const keys = new Set([...Object.keys(object2), ...Object.keys(object1)]);
  const mergedObject = {};
  for (const key of keys) {
    if (isObject(object1[key]) && isObject(object2[key])) {
      mergedObject[key] = mergeObjects(object1[key], object2[key]);
    } else if (object1[key] !== undefined) {
      mergedObject[key] = object1[key];
    } else {
      mergedObject[key] = object2[key];
    }
  }
  return mergedObject;
}

function getUnixtime(date: Date = new Date()) {
  return Math.round(date.getTime() / 1000);
}

const sleepCancelReasonSymbol = Symbol('sleepCancelReasonSymbol');

/**
 * Poll execution and use condition to accept or reject the results
 */
async function poll_<T, E = any>(
  ctx: ContextTimed,
  f: () => T | PromiseLike<T>,
  condition: {
    (e: E, result?: undefined): boolean;
    (e: null, result: T): boolean;
  },
  interval: number,
): Promise<T> {
  let result: T;
  const { p: abortP, resolveP: resolveAbortP } = promise();
  const handleAbortP = () => resolveAbortP();
  if (ctx.signal.aborted) {
    resolveAbortP();
  } else {
    ctx.signal.addEventListener('abort', handleAbortP, { once: true });
  }
  try {
    while (true) {
      if (ctx.signal.aborted) {
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
      const sleepP = sleepCancellable(interval);
      await Promise.race([sleepP, abortP])
        .finally(async () => {
          // Clean up
          sleepP.cancel(sleepCancelReasonSymbol);
          await sleepP;
        })
        .catch((e) => {
          if (e !== sleepCancelReasonSymbol) throw e;
        });
    }
  } finally {
    resolveAbortP();
    await abortP;
    ctx.signal.removeEventListener('abort', handleAbortP);
  }
}

const pollCancellable = timedCancellable(
  poll_,
  true,
  undefined,
  utilsErrors.ErrorUtilsPollTimeout,
);

/**
 * Poll execution and use condition to accept or reject the results
 */
function poll<T, E = any>(
  f: () => T | PromiseLike<T>,
  condition: {
    (e: E, result?: undefined): boolean;
    (e: null, result: T): boolean;
  },
  interval = 1000,
  ctx?: Partial<ContextTimedInput>,
): PromiseCancellable<T> {
  return pollCancellable(ctx, f, condition, interval);
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

/**
 * Promise constructed from signal
 * This rejects when the signal is aborted
 */
//  fixme: There is also a one signal to many `signalPromise` relationship in the NM connection queue that needs to be fixed.
function signalPromise(signal: AbortSignal): PromiseCancellable<void> {
  return new PromiseCancellable((resolve, _, signalCancel) => {
    // Short circuit if signal already aborted
    if (signal.aborted) return resolve();
    // Short circuit if promise is already cancelled
    if (signalCancel.aborted) return resolve();
    const handler = () => {
      signalCancel.removeEventListener('abort', handler);
      signal.removeEventListener('abort', handler);
      resolve();
    };
    signal.addEventListener('abort', handler, { once: true });
    signalCancel.addEventListener('abort', handler, { once: true });
  });
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

/**
 * Zero-copy wraps ArrayBuffer-like objects into Buffer
 * This supports ArrayBuffer, TypedArrays and the NodeJS Buffer
 */
function bufferWrap(
  array: BufferSource,
  offset?: number,
  length?: number,
): Buffer {
  if (Buffer.isBuffer(array)) {
    return array;
  } else if (ArrayBuffer.isView(array)) {
    return Buffer.from(
      array.buffer,
      offset ?? array.byteOffset,
      length ?? array.byteLength,
    );
  } else {
    return Buffer.from(array, offset, length);
  }
}

/**
 * Checks if data is an ArrayBuffer-like object
 * This includes ArrayBuffer, TypedArrays and the NodeJS Buffer
 */
function isBufferSource(data: unknown): data is BufferSource {
  return ArrayBuffer.isView(data) || data instanceof ArrayBuffer;
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

function isPromise(v: any): v is Promise<unknown> {
  return (
    v instanceof Promise ||
    (v != null &&
      typeof v.then === 'function' &&
      typeof v.catch === 'function' &&
      typeof v.finally === 'function')
  );
}

function isPromiseLike(v: any): v is PromiseLike<unknown> {
  return v != null && typeof v.then === 'function';
}

/**
 * Is generator object
 * Use this to check for generators
 */
function isGenerator(v: any): v is Generator<unknown> {
  return (
    v != null &&
    typeof v[Symbol.iterator] === 'function' &&
    typeof v.next === 'function' &&
    typeof v.return === 'function' &&
    typeof v.throw === 'function'
  );
}

/**
 * Is async generator object
 * Use this to check for async generators
 */
function isAsyncGenerator(v: any): v is AsyncGenerator<unknown> {
  return (
    v != null &&
    typeof v === 'object' &&
    typeof v[Symbol.asyncIterator] === 'function' &&
    typeof v.next === 'function' &&
    typeof v.return === 'function' &&
    typeof v.throw === 'function'
  );
}

/**
 * Encodes whole numbers (inc of 0) to lexicographic buffers
 */
function lexiPackBuffer(n: number): Buffer {
  return Buffer.from(lexi.pack(n));
}

/**
 * Decodes lexicographic buffers to whole numbers (inc of 0)
 */
function lexiUnpackBuffer(b: Buffer): number {
  return lexi.unpack([...b]);
}

/**
 * Used to yield to the event loop to allow other micro tasks to process
 */
async function yieldMicro() {
  return await new Promise<void>((r) => queueMicrotask(r));
}

/**
 * Increases the total number of registered event handlers before a node warning is emitted.
 * In most cases this is not needed but in the case where you have one event emitter for multiple handlers you'll need
 * to increase the limit.
 * @param target - The specific `EventTarget` or `EventEmitter` to increase the warning for.
 * @param limit - The limit before the warning is emitted, defaults to 100000.
 */
function setMaxListeners(
  target: EventTarget | NodeJS.EventEmitter,
  limit: number = 100000,
) {
  nodesEvents.setMaxListeners(limit, target);
}

export {
  AsyncFunction,
  GeneratorFunction,
  AsyncGeneratorFunction,
  getDefaultNodePath,
  never,
  mkdirExists,
  dirEmpty,
  pathIncludes,
  sleep,
  sleepCancellable,
  isObject,
  isEmptyObject,
  filterEmptyObject,
  filterObject,
  mergeObjects,
  getUnixtime,
  poll,
  promisify,
  promise,
  signalPromise,
  timerStart,
  timerStop,
  arraySet,
  arrayUnset,
  arrayZip,
  arrayZipWithPadding,
  asyncIterableArray,
  bufferSplit,
  debounce,
  isPromise,
  isPromiseLike,
  isGenerator,
  isAsyncGenerator,
  lexiPackBuffer,
  lexiUnpackBuffer,
  bufferWrap,
  isBufferSource,
  yieldMicro,
  setMaxListeners,
};
