import os from 'os';
import process from 'process';
import { Buffer } from 'buffer';
import * as errors from './errors';
import { FileSystem } from './types';

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

async function mkdirExists(fs, path, ...args) {
  try {
    return await fs.mkdir(path, ...args);
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

async function writeLock(
  fs: FileSystem,
  lockPath: string,
  grpcHost: string,
  grpcPort: number,
) {
  await fs.writeFile(
    lockPath,
    JSON.stringify({
      pid: process.pid,
      grpcHost: grpcHost,
      grpcPort: grpcPort,
    }),
  );
}

async function deleteLock(fs: FileSystem, lockPath: string) {
  try {
    const fh = await fs.open(lockPath, 'r');
    fh.close();
  } catch (err) {
    return;
  }
  await fs.rm(lockPath);
}

async function parseLock(
  fs: FileSystem,
  lockPath: string,
): Promise<{ pid: number; grpcHost: string; grpcPort: number } | false> {
  try {
    const fh = await fs.open(lockPath, 'r');
    const data = await fh.readFile();
    fh.close();
    return JSON.parse(data.toString());
  } catch (err) {
    return false;
  }
}

function pidIsRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
}

export {
  getDefaultNodePath,
  mkdirExists,
  sleep,
  getUnixtime,
  byteSize,
  promisify,
  writeLock,
  deleteLock,
  parseLock,
  pidIsRunning,
};
