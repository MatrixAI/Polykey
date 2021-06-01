import os from 'os';
import base58 from 'bs58';
import process from 'process';
import { Buffer } from 'buffer';
import { FileSystem, Timer } from './types';

import * as keysUtils from './keys/utils';
import * as networkUtils from './network/utils';
import * as errors from './errors';

function getDefaultNodePath(): string {
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
    throw new errors.ErrorPolykey('Unknown platform');
  }
  return p;
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

async function sleep(ms: number) {
  return await new Promise((r) => setTimeout(r, ms));
}

function getUnixtime(date: Date = new Date()) {
  return Math.round(date.getTime() / 1000);
}

function byteSize(bytes: string) {
  return Buffer.byteLength(bytes, 'binary');
}

function promisify<T>(f): (...args: any[]) => Promise<T> {
  return function <T>(...args): Promise<T> {
    return new Promise((resolve, reject) => {
      const callback = (error, ...values) => {
        if (error) {
          return reject(error);
        }
        return resolve(values.length === 1 ? values[0] : values);
      };
      args.push(callback);
      f.apply(this, args);
    });
  };
}

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

function isEmptyObject(o) {
  for (const k in o) return false;
  return true;
}

function getRandomInt(max = Number.MAX_SAFE_INTEGER) {
  return Math.floor(Math.random() * max);
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

function pidIsRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
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

async function generateUserToken() {
  const bytes = await keysUtils.getRandomBytes(32);
  return base58.encode(bytes);
}

export {
  getDefaultNodePath,
  mkdirExists,
  sleep,
  getUnixtime,
  byteSize,
  promisify,
  isEmptyObject,
  getRandomInt,
  timerStart,
  timerStop,
  promise,
  pidIsRunning,
  arraySet,
  arrayUnset,
  generateUserToken,
};
