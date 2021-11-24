import type { MutexInterface } from 'async-mutex';

import type { FileSystem, Timer } from './types';
import process from 'process';
import path from 'path';
import { Mutex } from 'async-mutex';

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

function pidIsRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

async function sleep(ms: number) {
  return await new Promise((r) => setTimeout(r, ms));
}

function isEmptyObject(o) {
  for (const k in o) return false;
  return true;
}

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

function getRandomInt(max = Number.MAX_SAFE_INTEGER) {
  return Math.floor(Math.random() * max);
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
) {
  let result: T;
  while (true) {
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
}

/**
 * Convert callback-style to promise-style
 */
function promisify<T>(f): (...args: any[]) => Promise<T> {
  return function <T>(...args): Promise<T> {
    return new Promise((resolve, reject) => {
      const callback = (error, ...values) => {
        if (error != null) {
          return reject(error);
        }
        return resolve(values.length === 1 ? values[0] : values);
      };
      args.push(callback);
      f.apply(this, args);
    });
  };
}

/**
 * Deconstructed promise
 */
function promise<T>(): {
  p: Promise<T>;
  resolveP: (value: T | PromiseLike<T>) => void;
  rejectP: (reason?: any) => void;
} {
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

class RWLock {
  protected readerCount: number = 0;
  protected lock: Mutex = new Mutex();
  protected release: MutexInterface.Releaser;

  public async read<T>(f: () => Promise<T>): Promise<T> {
    let readerCount = ++this.readerCount;
    // The first reader locks
    if (readerCount === 1) {
      this.release = await this.lock.acquire();
    }
    try {
      return await f();
    } finally {
      readerCount = --this.readerCount;
      // The last reader unlocks
      if (readerCount === 0) {
        this.release();
      }
    }
  }

  public async write<T>(f: () => Promise<T>): Promise<T> {
    this.release = await this.lock.acquire();
    try {
      return await f();
    } finally {
      this.release();
    }
  }
}

export {
  mkdirExists,
  pathIncludes,
  pidIsRunning,
  sleep,
  isEmptyObject,
  filterEmptyObject,
  getUnixtime,
  getRandomInt,
  poll,
  promisify,
  promise,
  timerStart,
  timerStop,
  arraySet,
  arrayUnset,
  RWLock,
};
