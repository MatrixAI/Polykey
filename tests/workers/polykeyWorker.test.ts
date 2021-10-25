import type { PolykeyWorkerManagerInterface } from '@/workers/types';

import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { createWorkerManager } from '@/workers/utils';

describe('Polykey worker', () => {
  const logger = new Logger('PolyKey Worker Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let workerManager: PolykeyWorkerManagerInterface;
  beforeAll(async () => {
    workerManager = await createWorkerManager({
      cores: 1,
      logger,
    });
  });
  afterAll(async () => {
    await workerManager.destroy();
  });
  test('generateKeyPairAsn1', async () => {
    await workerManager.call(async (w) => {
      await w.generateKeyPairAsn1(4096);
    });
  });
  test('encryptWithPublicKeyAsn1', async () => {
    const message = 'Hello world!';
    await workerManager.call(async (w) => {
      const keyPair = await w.generateKeyPairAsn1(4096);
      const encrypted = w.encryptWithPublicKeyAsn1(
        keyPair.privateKey,
        // @ts-ignore: threads.js types are wrong
        message,
      );
      expect(encrypted).not.toEqual(message);
    });
  });
  test('decryptWithPrivateKeyAsn1', async () => {
    await workerManager.call(async (w) => {
      const message = 'Hello world!';
      const keyPair = await w.generateKeyPairAsn1(4096);
      const encrypted = await w.encryptWithPublicKeyAsn1(
        keyPair.publicKey,
        message,
      );
      expect(encrypted).not.toEqual(message);
      const decrypted = await w.decryptWithPrivateKeyAsn1(
        keyPair.privateKey,
        encrypted,
      );
      expect(decrypted).toEqual(message);
    });
  });
  test('signWithPrivateKeyAsn1', async () => {
    await workerManager.call(async (w) => {
      const message = 'Hello world!';
      const keyPair = await w.generateKeyPairAsn1(4096);
      const signature = w.signWithPrivateKeyAsn1(keyPair.privateKey, message);
      expect(signature).toBeTruthy();
    });
  });
  test('verifyWithPublicKeyAsn1', async () => {
    await workerManager.call(async (w) => {
      const message = 'Hello world!';
      const keyPair = await w.generateKeyPairAsn1(4096);
      const signature = await w.signWithPrivateKeyAsn1(
        keyPair.privateKey,
        message,
      );
      expect(
        w.verifyWithPublicKeyAsn1(keyPair.publicKey, message, signature),
      ).toBeTruthy();
    });
  });
});
