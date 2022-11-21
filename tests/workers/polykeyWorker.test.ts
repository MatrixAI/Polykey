import type { PolykeyWorkerManagerInterface } from '@/workers/types';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { createWorkerManager } from '@/workers/utils';
import * as keysUtils from '@/keys/utils';

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
  test('hashPassword', async () => {
    await workerManager.call(async (w) => {
      await w.hashPassword('password');
    });
  });
  test('checkPassword', async () => {
    await workerManager.call(async (w) => {
      const [hash, salt] = await w.hashPassword('password');
      expect(await w.checkPassword('password', hash, salt)).toBeTrue();
    });
  });
  test('generateDeterministicKeyPair', async () => {
    const recoveryCode = keysUtils.generateRecoveryCode();
    await workerManager.call(async (w) => {
      await w.generateDeterministicKeyPair(recoveryCode);
    });
  });
  test('generateCertificate', async () => {
    const keyPair = keysUtils.generateKeyPair();
    const certId = keysUtils.createCertIdGenerator()();
    await workerManager.call(async (w) => {
      await w.generateCertificate({
        certId,
        subjectKeyPair: keyPair,
        issuerPrivateKey: keyPair.privateKey,
        duration: 0,
      });
    });
  });
  test('encrypt, decrypt', async () => {
    const key = keysUtils.generateKey();
    const message = 'HelloWorld!';
    await workerManager.call(async (w) => {
      const encrypted = await w.encrypt(key, Buffer.from(message));
      const decrypted = await w.decrypt(key, encrypted);
      expect(Buffer.from(decrypted!).toString()).toBe(message);
    });
  });
});
