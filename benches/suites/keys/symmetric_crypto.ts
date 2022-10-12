import b from 'benny';
import * as random from '@/keys/utils/random';
import * as generate from '@/keys/utils/generate';
import * as symmetric from '@/keys/utils/symmetric';
import { summaryName, suiteCommon } from '../../utils';

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
    summaryName(__filename),
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

if (require.main === module) {
  void main();
}

export default main;
