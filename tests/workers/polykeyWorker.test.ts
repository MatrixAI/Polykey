import type { PolykeyWorkerManager } from '#workers/types.js';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { createWorkerManager } from '#workers/utils.js';
import * as keysUtils from '#keys/utils/index.js';
import * as workersUtils from '#workers/utils.js';

describe('Polykey worker', () => {
  const logger = new Logger('PolyKey Worker Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let workerManager: PolykeyWorkerManager;
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
    await workerManager.methods.hashPassword({ password: 'password' });
  });
  test('checkPassword', async () => {
    const {
      data: [hash, salt],
    } = await workerManager.methods.hashPassword({ password: 'password' });
    const { data: result } = await workerManager.methods.checkPassword(
      {
        password: 'password',
        hash,
        salt,
      },
      [hash, salt],
    );
    expect(result).toBeTrue();
  });
  test('generateDeterministicKeyPair', async () => {
    const recoveryCode = keysUtils.generateRecoveryCode();
    await workerManager.methods.generateDeterministicKeyPair({ recoveryCode });
  });
  test('generateCertificate', async () => {
    const keyPair = keysUtils.generateKeyPair();
    const certId = keysUtils.createCertIdGenerator()();
    const certIdAB = workersUtils.toArrayBuffer(certId.toBuffer());
    const privateKeyAB = workersUtils.toArrayBuffer(keyPair.privateKey);
    const publicKeyAB = workersUtils.toArrayBuffer(keyPair.publicKey);
    await workerManager.methods.generateCertificate(
      {
        certId: certIdAB,
        subjectKeyPair: {
          privateKey: privateKeyAB,
          publicKey: publicKeyAB,
        },
        issuerPrivateKey: privateKeyAB,
        duration: 0,
      },
      [certIdAB, privateKeyAB, publicKeyAB],
    );
  });
  test('encrypt, decrypt', async () => {
    const key = keysUtils.generateKey();
    const keyAB = workersUtils.toArrayBuffer(key);
    const message = 'HelloWorld!';
    const plainTextAB = workersUtils.toArrayBuffer(Buffer.from(message));
    const { data: encryptedAB } = await workerManager.methods.encrypt(
      {
        key: keyAB,
        plainText: plainTextAB,
      },
      [plainTextAB],
    );
    const { data: decryptedAB } = await workerManager.methods.decrypt(
      {
        key: keyAB,
        cipherText: encryptedAB,
      },
      [encryptedAB],
    );
    expect(workersUtils.fromArrayBuffer(decryptedAB!).toString()).toBe(message);
  });
});
