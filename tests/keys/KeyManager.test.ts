import type { PolykeyWorkerManagerInterface } from '@/workers/types';
import type { KeyPair, PublicKey } from '@/keys/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Buffer } from 'buffer';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyManager from '@/keys/KeyManager';
import * as keysErrors from '@/keys/errors';
import * as workersUtils from '@/workers/utils';
import * as keysUtils from '@/keys/utils';
import { sleep } from '@/utils';
import { makeCrypto } from '../utils';

describe('KeyManager', () => {
  const password = 'password';
  const logger = new Logger('KeyManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let keyPair: KeyPair;
  let workerManager: PolykeyWorkerManagerInterface;
  let mockedGenerateDeterministicKeyPair;
  beforeAll(async () => {
    // Key pair generated once for mocking
    keyPair = await keysUtils.generateKeyPair(1024);
    workerManager = await workersUtils.createWorkerManager({
      cores: 1,
      logger,
    });
  });
  afterAll(async () => {
    await workerManager.destroy();
  });
  beforeEach(async () => {
    // Use the mock for all tests
    // Each test can individually restore the original implementation with mockRestore
    // Has to be set in beforeEach as mockRestore removes the spyOn
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(keyPair);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
  });
  afterEach(async () => {
    mockedGenerateDeterministicKeyPair.mockRestore();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('KeyManager readiness', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      keysPath,
      password,
      logger,
    });
    await expect(async () => {
      await keyManager.destroy();
    }).rejects.toThrow(keysErrors.ErrorKeyManagerRunning);
    // Should be a noop
    await keyManager.start({ password });
    await keyManager.stop();
    await keyManager.destroy();
    await expect(keyManager.start({ password })).rejects.toThrow(
      keysErrors.ErrorKeyManagerDestroyed,
    );
    expect(() => {
      keyManager.getRootKeyPair();
    }).toThrow(keysErrors.ErrorKeyManagerNotRunning);
    await expect(async () => {
      await keyManager.getRootCertChain();
    }).rejects.toThrow(keysErrors.ErrorKeyManagerNotRunning);
  });
  test('constructs root key pair, root cert, root certs and db key', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      keysPath,
      password,
      logger,
    });
    const keysPathContents = await fs.promises.readdir(keysPath);
    expect(keysPathContents).toContain('root.pub');
    expect(keysPathContents).toContain('root.key');
    expect(keysPathContents).toContain('root.crt');
    expect(keysPathContents).toContain('root_certs');
    expect(keysPathContents).toContain('db.key');
    expect(keyManager.dbKey.toString()).toBeTruthy();
    const rootKeyPairPem = await keyManager.getRootKeyPairPem();
    expect(rootKeyPairPem).not.toBeUndefined();
    const rootCertPem = await keyManager.getRootCertPem();
    expect(rootCertPem).not.toBeUndefined();
    const rootCertPems = await keyManager.getRootCertChainPems();
    expect(rootCertPems.length).toBe(1);
    const rootCertChainPem = await keyManager.getRootCertChainPem();
    expect(rootCertChainPem).not.toBeUndefined();
    await keyManager.stop();
  });
  test(
    'creates a recovery code and can recover from the same code',
    async () => {
      // Use the real generateDeterministicKeyPair
      mockedGenerateDeterministicKeyPair.mockRestore();
      const keysPath = `${dataDir}/keys`;
      // Minimum key pair size is 1024
      // Key pair generation can take 4 to 15 seconds
      const keyManager = await KeyManager.createKeyManager({
        password,
        keysPath,
        rootKeyPairBits: 1024,
        logger,
      });
      const nodeId = keyManager.getNodeId();
      // Acquire the recovery code
      const recoveryCode = keyManager.getRecoveryCode()!;
      expect(recoveryCode).toBeDefined();
      await keyManager.stop();
      // Oops forgot the password
      // Use the recovery code to recover and set the new password
      await keyManager.start({
        password: 'newpassword',
        recoveryCode,
      });
      expect(await keyManager.checkPassword('newpassword')).toBe(true);
      expect(keyManager.getNodeId()).toBe(nodeId);
      await keyManager.stop();
    },
    global.defaultTimeout * 2,
  );
  test(
    'create deterministic keypair with recovery code',
    async () => {
      // Use the real generateDeterministicKeyPair
      mockedGenerateDeterministicKeyPair.mockRestore();
      const recoveryCode = keysUtils.generateRecoveryCode();
      const keysPath1 = `${dataDir}/keys1`;
      const keyManager1 = await KeyManager.createKeyManager({
        password,
        recoveryCode,
        keysPath: keysPath1,
        rootKeyPairBits: 1024,
        logger,
      });
      expect(keyManager1.getRecoveryCode()).toBe(recoveryCode);
      const nodeId1 = keyManager1.getNodeId();
      await keyManager1.stop();
      const keysPath2 = `${dataDir}/keys2`;
      const keyManager2 = await KeyManager.createKeyManager({
        password,
        recoveryCode,
        keysPath: keysPath2,
        rootKeyPairBits: 1024,
        logger,
      });
      expect(keyManager2.getRecoveryCode()).toBe(recoveryCode);
      const nodeId2 = keyManager2.getNodeId();
      await keyManager2.stop();
      expect(nodeId1).toBe(nodeId2);
    },
    global.defaultTimeout * 2,
  );
  test('uses WorkerManager for generating root key pair', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    keyManager.setWorkerManager(workerManager);
    const keysPathContents = await fs.promises.readdir(keysPath);
    expect(keysPathContents).toContain('root.pub');
    expect(keysPathContents).toContain('root.key');
    await keyManager.stop();
    keyManager.unsetWorkerManager();
  });
  test('encrypting and decrypting with root key', async () => {
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath: `${dataDir}/keys`,
      logger,
    });
    const plainText = Buffer.from('abc');
    const cipherText = await keyManager.encryptWithRootKeyPair(plainText);
    const plainText_ = await keyManager.decryptWithRootKeyPair(cipherText);
    expect(plainText_.equals(plainText)).toBe(true);
    await keyManager.stop();
  });
  test('uses WorkerManager for encryption and decryption with root key', async () => {
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath: `${dataDir}/keys`,
      logger,
    });
    keyManager.setWorkerManager(workerManager);
    const plainText = Buffer.from('abc');
    const cipherText = await keyManager.encryptWithRootKeyPair(plainText);
    const plainText_ = await keyManager.decryptWithRootKeyPair(cipherText);
    expect(plainText_.equals(plainText)).toBe(true);
    await keyManager.stop();
    keyManager.unsetWorkerManager();
  });
  test('encrypting beyond maximum size', async () => {
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath: `${dataDir}/keys`,
      logger,
    });
    // No way we can encrypt 1000 bytes without a ridiculous key size
    const plainText = Buffer.from(new Array(1000 + 1).join('A'));
    const maxSize = keysUtils.maxEncryptSize(
      keysUtils.publicKeyBitSize(keyPair.publicKey) / 8,
      32,
    );
    await expect(keyManager.encryptWithRootKeyPair(plainText)).rejects.toThrow(
      `Maximum plain text byte size is ${maxSize}`,
    );
    await keyManager.stop();
  });
  test('signing and verifying with root key', async () => {
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath: `${dataDir}/keys`,
      logger,
    });
    const data = Buffer.from('abc');
    const signature = await keyManager.signWithRootKeyPair(data);
    const signed = await keyManager.verifyWithRootKeyPair(data, signature);
    expect(signed).toBe(true);
    await keyManager.stop();
  });
  test('uses WorkerManager for signing and verifying with root key', async () => {
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath: `${dataDir}/keys`,
      logger,
    });
    keyManager.setWorkerManager(workerManager);
    const data = Buffer.from('abc');
    const signature = await keyManager.signWithRootKeyPair(data);
    const signed = await keyManager.verifyWithRootKeyPair(data, signature);
    expect(signed).toBe(true);
    await keyManager.stop();
    keyManager.unsetWorkerManager();
  });
  test('can change root key password', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    await keyManager.changePassword('newpassword');
    await keyManager.stop();
    await expect(async () => {
      await KeyManager.createKeyManager({
        password: 'password',
        keysPath,
        logger,
      });
    }).rejects.toThrow(keysErrors.ErrorRootKeysParse);
    await KeyManager.createKeyManager({
      password: 'newpassword',
      keysPath,
      logger,
    });
    await keyManager.stop();
  });
  test('can reset root certificate', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const rootCert1 = keyManager.getRootCert();
    // We use seconds for sequence numbers
    // in the future we should be using monotonic time
    await sleep(2000);
    await keyManager.resetRootCert();
    const rootCert2 = keyManager.getRootCert();
    expect(keysUtils.publicKeyToPem(rootCert1.publicKey as PublicKey)).toBe(
      keysUtils.publicKeyToPem(rootCert2.publicKey as PublicKey),
    );
    expect(rootCert1.serialNumber).not.toBe(rootCert2.serialNumber);
    expect(rootCert1.validity.notBefore < rootCert2.validity.notBefore).toBe(
      true,
    );
    expect(rootCert1.validity.notAfter < rootCert2.validity.notAfter).toBe(
      true,
    );
    await keyManager.stop();
  });
  test('can reset root key pair', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    // KeyManager manages the db key
    const dbPath = `${dataDir}/db`;
    const db = await DB.createDB({
      dbPath,
      logger,
      crypto: makeCrypto(keyManager.dbKey),
    });
    const rootKeyPair1 = keyManager.getRootKeyPair();
    const rootCert1 = keyManager.getRootCert();
    await sleep(2000); // Let's just make sure there is time diff
    await db.put(['test'], 'hello', 'world');
    // Reset root key pair takes time
    await keyManager.resetRootKeyPair('password');
    expect(keyManager.getRecoveryCode()).toBeDefined();
    const rootKeyPair2 = keyManager.getRootKeyPair();
    const rootCert2 = keyManager.getRootCert();
    expect(rootCert1.serialNumber).not.toBe(rootCert2.serialNumber);
    expect(rootCert1.validity.notBefore < rootCert2.validity.notBefore).toBe(
      true,
    );
    expect(rootCert1.validity.notAfter < rootCert2.validity.notAfter).toBe(
      true,
    );
    expect(keysUtils.keyPairToPem(rootKeyPair1)).not.toBe(
      keysUtils.keyPairToPem(rootKeyPair2),
    );
    expect(keysUtils.publicKeyToPem(rootCert1.publicKey as PublicKey)).toBe(
      keysUtils.publicKeyToPem(rootKeyPair1.publicKey as PublicKey),
    );
    expect(keysUtils.publicKeyToPem(rootCert2.publicKey as PublicKey)).toBe(
      keysUtils.publicKeyToPem(rootKeyPair2.publicKey as PublicKey),
    );
    await db.stop();
    await db.start();
    expect(await db.get(['test'], 'hello')).toBe('world');
    await keyManager.stop();
  });
  test('can renew root key pair', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const dbPath = `${dataDir}/db`;
    const db = await DB.createDB({
      dbPath,
      logger,
      crypto: makeCrypto(keyManager.dbKey),
    });
    const rootKeyPair1 = keyManager.getRootKeyPair();
    const rootCert1 = keyManager.getRootCert();
    await sleep(2000); // Let's just make sure there is time diff
    await db.put(['test'], 'hello', 'world');
    await keyManager.renewRootKeyPair('newpassword');
    expect(keyManager.getRecoveryCode()).toBeDefined();
    const rootKeyPair2 = keyManager.getRootKeyPair();
    const rootCert2 = keyManager.getRootCert();
    expect(rootCert1.serialNumber).not.toBe(rootCert2.serialNumber);
    expect(rootCert1.validity.notBefore < rootCert2.validity.notBefore).toBe(
      true,
    );
    expect(rootCert1.validity.notAfter < rootCert2.validity.notAfter).toBe(
      true,
    );
    expect(keysUtils.keyPairToPem(rootKeyPair1)).not.toBe(
      keysUtils.keyPairToPem(rootKeyPair2),
    );
    expect(keysUtils.publicKeyToPem(rootCert1.publicKey as PublicKey)).toBe(
      keysUtils.publicKeyToPem(rootKeyPair1.publicKey as PublicKey),
    );
    expect(keysUtils.publicKeyToPem(rootCert2.publicKey as PublicKey)).toBe(
      keysUtils.publicKeyToPem(rootKeyPair2.publicKey as PublicKey),
    );
    // All certificates are self-signed via an extension
    expect(keysUtils.certVerifiedNode(rootCert1)).toBe(true);
    expect(keysUtils.certVerifiedNode(rootCert2)).toBe(true);
    // Cert chain is ensured
    expect(keysUtils.certIssued(rootCert1, rootCert2)).toBe(true);
    expect(keysUtils.certVerified(rootCert1, rootCert2)).toBe(true);
    await db.stop();
    await db.start();
    expect(await db.get(['test'], 'hello')).toBe('world');
    await keyManager.stop();
  });
  test('order of certificate chain should be leaf to root', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const rootCertPem1 = keyManager.getRootCertPem();
    await sleep(2000); // Let's just make sure there is time diff
    // renew root key pair takes time
    await keyManager.renewRootKeyPair('newpassword');
    const rootCertPem2 = keyManager.getRootCertPem();
    await sleep(2000); // Let's just make sure there is time diff
    // renew root key pair takes time
    await keyManager.renewRootKeyPair('newnewpassword');
    const rootCertPem3 = keyManager.getRootCertPem();
    const rootCertChainPems = await keyManager.getRootCertChainPems();
    const rootCertChainPem = await keyManager.getRootCertChainPem();
    const rootCertChain = await keyManager.getRootCertChain();
    // The order should be from leaf to root
    expect(rootCertChainPems).toStrictEqual([
      rootCertPem3,
      rootCertPem2,
      rootCertPem1,
    ]);
    expect(rootCertChainPem).toBe(
      [rootCertPem3, rootCertPem2, rootCertPem1].join(''),
    );
    const rootCertChainPems_ = rootCertChain.map((c) => {
      return keysUtils.certToPem(c);
    });
    expect(rootCertChainPems_).toStrictEqual([
      rootCertPem3,
      rootCertPem2,
      rootCertPem1,
    ]);
    await keyManager.stop();
  });
  describe('dbKey', () => {
    test('Creates a key when started.', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyManager = await KeyManager.createKeyManager({
        password,
        keysPath,
        logger,
      });
      expect(await fs.promises.readdir(keysPath)).toContain('db.key');
      expect(keyManager.dbKey.toString()).toBeTruthy();
      await keyManager.stop();
    });
    test('Throws an exception when it fails to parse the key.', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyManager = await KeyManager.createKeyManager({
        password,
        keysPath,
        logger,
      });
      expect(await fs.promises.readdir(keysPath)).toContain('db.key');
      expect(keyManager.dbKey.toString()).toBeTruthy();
      await keyManager.stop();
      await expect(
        KeyManager.createKeyManager({
          password: 'OtherPassword',
          keysPath,
          logger,
        }),
      ).rejects.toThrow();
      await keyManager.stop();
    });
    test('key remains unchanged when resetting keys.', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyManager1 = await KeyManager.createKeyManager({
        password,
        keysPath,
        logger,
      });
      expect(await fs.promises.readdir(keysPath)).toContain('db.key');
      expect(keyManager1.dbKey.toString()).toBeTruthy();
      const dbKey = keyManager1.dbKey;

      await keyManager1.resetRootKeyPair('NewPassword');
      expect(keyManager1.dbKey).toEqual(dbKey);
      await keyManager1.stop();

      const keyManager2 = await KeyManager.createKeyManager({
        password: 'NewPassword',
        keysPath,
        logger,
      });
      expect(keyManager2.dbKey).toEqual(dbKey);
      await keyManager2.stop();
    });
    test('key remains unchanged when renewing keys.', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyManager1 = await KeyManager.createKeyManager({
        password,
        keysPath,
        logger,
      });
      expect(await fs.promises.readdir(keysPath)).toContain('db.key');
      expect(keyManager1.dbKey.toString()).toBeTruthy();
      const dbKey = keyManager1.dbKey;

      await keyManager1.renewRootKeyPair('NewPassword');
      expect(keyManager1.dbKey).toEqual(dbKey);
      await keyManager1.stop();

      const keyManager2 = await KeyManager.createKeyManager({
        password: 'NewPassword',
        keysPath,
        logger,
      });
      expect(keyManager2.dbKey).toEqual(dbKey);
      await keyManager2.stop();
    });
  });
});
