import os from 'os';
import process from 'process';
import { Buffer } from 'buffer';
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

export { getDefaultNodePath, mkdirExists, sleep, getUnixtime, byteSize };
