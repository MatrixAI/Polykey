import b from 'benny';
import * as random from '@/keys/utils/random';
import * as generate from '@/keys/utils/generate';
import * as symmetric from '@/keys/utils/symmetric';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const key = await generate.generateKey(256);
  const plain512B = random.getRandomBytesSync(512);
  const plain1KiB = random.getRandomBytesSync(1024);
  const plain10KiB = random.getRandomBytesSync(1024 * 10);
  const cipher512B = await symmetric.encryptWithKey(key, plain512B);
  const cipher1KiB = await symmetric.encryptWithKey(key, plain1KiB);
  const cipher10KiB = await symmetric.encryptWithKey(key, plain10KiB);
  const summary = await b.suite(
    summaryName(__filename),
    b.add('encrypt 512 B of data', async () => {
      await symmetric.encryptWithKey(key, plain512B);
    }),
    b.add('encrypt 1 KiB of data', async () => {
      await symmetric.encryptWithKey(key, plain1KiB);
    }),
    b.add('encrypt 10 KiB of data', async () => {
      await symmetric.encryptWithKey(key, plain10KiB);
    }),
    b.add('decrypt 512 B of data', async () => {
      await symmetric.decryptWithKey(key, cipher512B);
    }),
    b.add('decrypt 1 KiB of data', async () => {
      await symmetric.decryptWithKey(key, cipher1KiB);
    }),
    b.add('decrypt 10 KiB of data', async () => {
      await symmetric.decryptWithKey(key, cipher10KiB);
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
