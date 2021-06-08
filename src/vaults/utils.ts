import type { FileSystem } from '../types';

import fs from 'fs';
import path from 'path';
import base58 from 'bs58';
import { EncryptedFS } from 'encryptedfs';
import { getRandomBytes, getRandomBytesSync } from '../keys/utils';

const KEY_LEN = 32;
const ID_LEN = 42;

async function generateVaultKey() {
  const key = await getRandomBytes(KEY_LEN);
  return Buffer.from(key);
}

function generateVaultKeySync() {
  const key = getRandomBytesSync(KEY_LEN);
  return Buffer.from(key);
}

async function generateVaultId() {
  const id = await getRandomBytes(ID_LEN);
  return base58.encode(id);
}

function generateVaultIdSync() {
  const id = getRandomBytesSync(ID_LEN);
  return base58.encode(id);
}

async function fileExists(fs: FileSystem, path): Promise<boolean> {
  try {
    const fh = await fs.promises.open(path, 'r');
    fh.close();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
  }
  return true;
}

function isUnixHiddenPath(path: string): boolean {
  return /\.|\/\.[^\/]+/g.test(path);
}

async function* readdirRecursively(dir: string) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory() && !isUnixHiddenPath(dirent.name)) {
      yield* readdirRecursively(res);
    } else if (dirent.isFile()) {
      yield res;
    }
  }
}

async function* readdirRecursivelyEFS(fs: EncryptedFS, dir: string) {
  const dirents = fs.readdirSync(dir);
  for (const dirent of dirents) {
    const res = dirent;
    if (
      fs.statSync(path.join(dir, res)).isDirectory() &&
      !isUnixHiddenPath(dirent)
    ) {
      yield* readdirRecursivelyEFS(fs, path.join(dir, res));
    } else if (fs.statSync(path.join(dir, res)).isFile()) {
      yield path.resolve(dir, res);
    }
  }
}

export {
  generateVaultKey,
  generateVaultKeySync,
  generateVaultId,
  generateVaultIdSync,
  fileExists,
  readdirRecursively,
  readdirRecursivelyEFS,
};
