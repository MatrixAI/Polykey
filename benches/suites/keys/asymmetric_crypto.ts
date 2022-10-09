import b from 'benny';
import * as random from '@/keys/utils/random';
import * as generate from '@/keys/utils/generate';
import * as asymmetric from '@/keys/utils/asymmetric';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const keyPair = generate.generateKeyPair();
  const plain512B = random.getRandomBytes(512);
  const plain1KiB = random.getRandomBytes(1024);
  const plain10KiB = random.getRandomBytes(1024 * 10);
  const cipher512B = asymmetric.encryptWithPublicKey(
    keyPair.publicKey,
    plain512B,
  );
  const cipher1KiB = asymmetric.encryptWithPublicKey(
    keyPair.publicKey,
    plain1KiB,
  );
  const cipher10KiB = asymmetric.encryptWithPublicKey(
    keyPair.publicKey,
    plain10KiB,
  );
  const signature512B = asymmetric.signWithPrivateKey(
    keyPair.privateKey,
    plain512B,
  );
  const signature1KiB = asymmetric.signWithPrivateKey(
    keyPair.privateKey,
    plain1KiB,
  );
  const signature10KiB = asymmetric.signWithPrivateKey(
    keyPair.privateKey,
    plain10KiB,
  );
  const summary = await b.suite(
    summaryName(__filename),
    b.add('encrypt 512 B of data', () => {
      asymmetric.encryptWithPublicKey(keyPair.publicKey, plain512B);
    }),
    b.add('encrypt 1 KiB of data', () => {
      asymmetric.encryptWithPublicKey(keyPair.publicKey, plain1KiB);
    }),
    b.add('encrypt 10 KiB of data', () => {
      asymmetric.encryptWithPublicKey(keyPair.publicKey, plain10KiB);
    }),
    b.add('decrypt 512 B of data', () => {
      asymmetric.decryptWithPrivateKey(keyPair, cipher512B);
    }),
    b.add('decrypt 1 KiB of data', () => {
      asymmetric.decryptWithPrivateKey(keyPair, cipher1KiB);
    }),
    b.add('decrypt 10 KiB of data', () => {
      asymmetric.decryptWithPrivateKey(keyPair, cipher10KiB);
    }),
    b.add('sign 512 B of data', () => {
      asymmetric.signWithPrivateKey(keyPair.privateKey, plain512B);
    }),
    b.add('sign 1 KiB of data', () => {
      asymmetric.signWithPrivateKey(keyPair.privateKey, plain1KiB);
    }),
    b.add('sign 10 KiB of data', () => {
      asymmetric.signWithPrivateKey(keyPair.privateKey, plain10KiB);
    }),
    b.add('verify 512 B of data', () => {
      asymmetric.verifyWithPublicKey(
        keyPair.publicKey,
        plain512B,
        signature512B,
      );
    }),
    b.add('verify 1 KiB of data', () => {
      asymmetric.verifyWithPublicKey(
        keyPair.publicKey,
        plain1KiB,
        signature1KiB,
      );
    }),
    b.add('verify 10 KiB of data', () => {
      asymmetric.verifyWithPublicKey(
        keyPair.publicKey,
        plain10KiB,
        signature10KiB,
      );
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
