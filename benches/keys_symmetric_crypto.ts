import url from 'node:url';
import path from 'node:path';
import b from 'benny';
import { suiteCommon } from './utils/utils.js';
import * as random from '#keys/utils/random.js';
import * as generate from '#keys/utils/generate.js';
import * as symmetric from '#keys/utils/symmetric.js';

const filename = url.fileURLToPath(new URL(import.meta.url));

async function main() {
  const key = generate.generateKey();
  const plain512B = random.getRandomBytes(512);
  const plain1KiB = random.getRandomBytes(1024);
  const plain10KiB = random.getRandomBytes(1024 * 10);
  const plain1MiB = random.getRandomBytes(1024 * 1024);
  const plain10MiB = random.getRandomBytes(1024 * 1024 * 10);
  const cipher512B = symmetric.encryptWithKey(key, plain512B);
  const cipher1KiB = symmetric.encryptWithKey(key, plain1KiB);
  const cipher10KiB = symmetric.encryptWithKey(key, plain10KiB);
  const cipher1MiB = symmetric.encryptWithKey(key, plain1MiB);
  const cipher10MiB = symmetric.encryptWithKey(key, plain10MiB);
  const summary = await b.suite(
    path.basename(filename, path.extname(filename)),
    b.add('encrypt 512 B of data', () => {
      symmetric.encryptWithKey(key, plain512B);
    }),
    b.add('encrypt 1 KiB of data', () => {
      symmetric.encryptWithKey(key, plain1KiB);
    }),
    b.add('encrypt 10 KiB of data', () => {
      symmetric.encryptWithKey(key, plain10KiB);
    }),
    b.add('encrypt 1 MiB of data', () => {
      symmetric.encryptWithKey(key, plain1MiB);
    }),
    b.add('encrypt 10 MiB of data', () => {
      symmetric.encryptWithKey(key, plain10MiB);
    }),
    b.add('decrypt 512 B of data', () => {
      symmetric.decryptWithKey(key, cipher512B);
    }),
    b.add('decrypt 1 KiB of data', () => {
      symmetric.decryptWithKey(key, cipher1KiB);
    }),
    b.add('decrypt 10 KiB of data', () => {
      symmetric.decryptWithKey(key, cipher10KiB);
    }),
    b.add('decrypt 1 MiB of data', () => {
      symmetric.decryptWithKey(key, cipher1MiB);
    }),
    b.add('decrypt 10 MiB of data', () => {
      symmetric.decryptWithKey(key, cipher10MiB);
    }),
    ...suiteCommon,
  );
  return summary;
}

if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    void main();
  }
}

export default main;
