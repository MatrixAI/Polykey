import type { PublicKey } from '@/keys/types';
import type { PolykeyWorkerManagerInterface } from '@/workers/types';

import fs from 'fs';
import os from 'os';
import path from 'path';
import { Buffer } from 'buffer';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import KeyManager from '@/keys/KeyManager';
import { DB } from '@matrixai/db';
import { sleep } from '@/utils';
import * as keysUtils from '@/keys/utils';
import * as keysErrors from '@/keys/errors';
import { makeCrypto } from '../utils';
import { isNodeId, makeNodeId } from '@/nodes/utils';
import { createWorkerManager } from '@/workers/utils';

describe('KeyManager', () => {
  const password = 'password';
  const logger = new Logger('KeyManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  const cores = 1;
  let workerManager: PolykeyWorkerManagerInterface;
  beforeAll(async () => {
    workerManager = await createWorkerManager({
      cores,
      logger,
    });
  });
  afterAll(async () => {
    await workerManager.destroy();
  });
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('construction constructs root key pair and root cert and root certs', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const keysPathContents = await fs.promises.readdir(keysPath);
    expect(keysPathContents).toContain('root.pub');
    expect(keysPathContents).toContain('root.key');
    expect(keysPathContents).toContain('root.crt');
    expect(keysPathContents).toContain('root_certs');
    await keyManager.destroy();
  });
  test('can get root key pair and root cert', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const rootKeyPairPem = await keyManager.getRootKeyPairPem();
    expect(rootKeyPairPem).not.toBeUndefined();
    const rootCertPem = await keyManager.getRootCertPem();
    expect(rootCertPem).not.toBeUndefined();
    const rootCertPems = await keyManager.getRootCertChainPems();
    expect(rootCertPems.length).toBe(1);
    const rootCertChainPem = await keyManager.getRootCertChainPem();
    expect(rootCertChainPem).not.toBeUndefined();
    await keyManager.destroy();
  });
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
    await keyManager.destroy();
    keyManager.unsetWorkerManager();
  });
  test('encrypting and decrypting with root key', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const plainText = Buffer.from('abc');
    const cipherText = await keyManager.encryptWithRootKeyPair(plainText);
    const plainText_ = await keyManager.decryptWithRootKeyPair(cipherText);
    expect(plainText_.equals(plainText)).toBe(true);
    await keyManager.destroy();
  });
  test('uses WorkerManager for encryption and decryption with root key', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    keyManager.setWorkerManager(workerManager);
    const plainText = Buffer.from('abc');
    const cipherText = await keyManager.encryptWithRootKeyPair(plainText);
    const plainText_ = await keyManager.decryptWithRootKeyPair(cipherText);
    expect(plainText_.equals(plainText)).toBe(true);
    await keyManager.destroy();
    keyManager.unsetWorkerManager();
  });
  test('encrypting beyond maximum size', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    // No way we can encrypt 1000 bytes without a ridiculous key size
    const plainText = Buffer.from(new Array(1000 + 1).join('A'));
    await expect(keyManager.encryptWithRootKeyPair(plainText)).rejects.toThrow(
      keysErrors.ErrorEncryptSize,
    );
    await keyManager.destroy();
  });
  test('signing and verifying with root key', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const data = Buffer.from('abc');
    const signature = await keyManager.signWithRootKeyPair(data);
    const signed = await keyManager.verifyWithRootKeyPair(data, signature);
    expect(signed).toBe(true);
    await keyManager.destroy();
  });
  test('uses WorkerManager for signing and verifying with root key', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    keyManager.setWorkerManager(workerManager);
    const data = Buffer.from('abc');
    const signature = await keyManager.signWithRootKeyPair(data);
    const signed = await keyManager.verifyWithRootKeyPair(data, signature);
    expect(signed).toBe(true);
    await keyManager.destroy();
    keyManager.unsetWorkerManager();
  });
  test('can change root key password', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    await keyManager.changeRootKeyPassword('newpassword');
    await keyManager.destroy();
    await expect(async () => {
      await KeyManager.createKeyManager({
        password: 'password',
        keysPath,
        logger,
      });
    }).rejects.toThrow(keysErrors.ErrorRootKeysParse);
    await expect(
      (async () => {
        await KeyManager.createKeyManager({
          password: 'newpassword',
          keysPath,
          logger,
        });
        await keyManager.destroy();
      })(),
    ).resolves.toBeUndefined();
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
    await keyManager.destroy();
  });
  test('can reset root key pair', async () => {
    const keysPath = `${dataDir}/keys`;
    const dbPath = `${dataDir}/db`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const db = await DB.createDB({
      dbPath,
      logger,
      crypto: makeCrypto(keyManager),
    });
    const rootKeyPair1 = keyManager.getRootKeyPair();
    const rootCert1 = keyManager.getRootCert();
    await sleep(2000); // Let's just make sure there is time diff
    await db.start();
    await db.put(['test'], 'hello', 'world');
    // Reset root key pair takes time
    await keyManager.resetRootKeyPair('password');
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

    //Testing DB.
    await expect(db.stop()).resolves.toBe(undefined);
    await expect(db.start()).resolves.toBe(undefined);
    expect(await db.get(['test'], 'hello')).toBe('world');
    await keyManager.destroy();
  });
  test('can renew root key pair', async () => {
    const keysPath = `${dataDir}/keys`;
    const dbPath = `${dataDir}/db`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const db = await DB.createDB({
      dbPath,
      logger,
      crypto: makeCrypto(keyManager),
    });
    const rootKeyPair1 = keyManager.getRootKeyPair();
    const rootCert1 = keyManager.getRootCert();
    await sleep(2000); // Let's just make sure there is time diff
    // renew root key pair takes time
    await db.start();
    await db.put(['test'], 'hello', 'world');
    await keyManager.renewRootKeyPair('newpassword');
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

    //Testing DB.
    await expect(db.stop()).resolves.toBe(undefined);
    await expect(db.start()).resolves.toBe(undefined);
    expect(await db.get(['test'], 'hello')).toBe('world');

    await keyManager.destroy();
  });
  test(
    'order of certificate chain should be leaf to root',
    async () => {
      const keysPath = `${dataDir}/keys`;
      const dbPath = `${dataDir}/db`;
      const keyManager = await KeyManager.createKeyManager({
        password,
        keysPath,
        logger,
      });
      const db = await DB.createDB({
        dbPath,
        logger,
        crypto: makeCrypto(keyManager),
      });
      const rootCertPem1 = keyManager.getRootCertPem();
      await sleep(2000); // Let's just make sure there is time diff
      // renew root key pair takes time
      await db.start();
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
      await keyManager.destroy();
    },
    global.defaultTimeout * 2 + 5000,
  );
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
    });
    test('Throws an exception when it fails to parse the key.', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyManager = await KeyManager.createKeyManager({
        password: 'Password',
        keysPath,
        logger,
      });
      expect(await fs.promises.readdir(keysPath)).toContain('db.key');
      expect(keyManager.dbKey.toString()).toBeTruthy();
      await keyManager.destroy();

      // Use a different key.
      await expect(
        KeyManager.createKeyManager({
          password: 'OtherPassword',
          keysPath,
          logger,
        }),
      ).rejects.toThrow();
    });
    test('key remains unchanged when resetting keys.', async () => {
      const keysPath = `${dataDir}/keys`;
      let keyManager = await KeyManager.createKeyManager({
        password: 'Password',
        keysPath,
        logger,
      });
      expect(await fs.promises.readdir(keysPath)).toContain('db.key');
      expect(keyManager.dbKey.toString()).toBeTruthy();
      const dbKey = keyManager.dbKey;

      await keyManager.resetRootKeyPair('NewPassword');
      expect(keyManager.dbKey).toEqual(dbKey);
      await keyManager.destroy();

      // Use a different key.
      keyManager = await KeyManager.createKeyManager({
        password: 'NewPassword',
        keysPath,
        logger,
      });
      expect(keyManager.dbKey).toEqual(dbKey);
      await keyManager.destroy();
    });
    test('key remains unchanged when renewing keys.', async () => {
      const keysPath = `${dataDir}/keys`;
      let keyManager = await KeyManager.createKeyManager({
        password: 'Password',
        keysPath,
        logger,
      });
      expect(await fs.promises.readdir(keysPath)).toContain('db.key');
      expect(keyManager.dbKey.toString()).toBeTruthy();
      const dbKey = keyManager.dbKey;

      await keyManager.renewRootKeyPair('NewPassword');
      expect(keyManager.dbKey).toEqual(dbKey);
      await keyManager.destroy();

      // Use a different key.
      keyManager = await KeyManager.createKeyManager({
        password: 'NewPassword',
        keysPath,
        logger,
      });
      expect(keyManager.dbKey).toEqual(dbKey);
      await keyManager.destroy();
    });
  });
  describe('vaultKey', () => {
    test('Creates a key when started.', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyManager = await KeyManager.createKeyManager({
        password,
        keysPath,
        logger,
      });
      expect(await fs.promises.readdir(keysPath)).toContain('vault.key');
      expect(keyManager.vaultKey.toString()).toBeTruthy();
    });
    test('Throws an exception when it fails to parse the key.', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyManager = await KeyManager.createKeyManager({
        password: 'Password',
        keysPath,
        logger,
      });
      expect(await fs.promises.readdir(keysPath)).toContain('vault.key');
      expect(keyManager.vaultKey.toString()).toBeTruthy();
      await keyManager.destroy();

      // Use a different key.
      await expect(
        KeyManager.createKeyManager({
          password: 'OtherPassword',
          keysPath,
          logger,
        }),
      ).rejects.toThrow();
    });
    test('key remains unchanged when resetting keys.', async () => {
      const keysPath = `${dataDir}/keys`;
      let keyManager = await KeyManager.createKeyManager({
        password: 'Password',
        keysPath,
        logger,
      });
      expect(await fs.promises.readdir(keysPath)).toContain('vault.key');
      expect(keyManager.vaultKey.toString()).toBeTruthy();
      const vaultKey = keyManager.vaultKey;

      await keyManager.resetRootKeyPair('NewPassword');
      expect(keyManager.vaultKey).toEqual(vaultKey);
      await keyManager.destroy();

      // Use a different key.
      keyManager = await KeyManager.createKeyManager({
        password: 'NewPassword',
        keysPath,
        logger,
      });
      expect(keyManager.vaultKey).toEqual(vaultKey);
      await keyManager.destroy();
    });
    test('key remains unchanged when renewing keys.', async () => {
      const keysPath = `${dataDir}/keys`;
      let keyManager = await KeyManager.createKeyManager({
        password: 'Password',
        keysPath,
        logger,
      });
      expect(await fs.promises.readdir(keysPath)).toContain('vault.key');
      expect(keyManager.vaultKey.toString()).toBeTruthy();
      const vaultKey = keyManager.vaultKey;

      await keyManager.renewRootKeyPair('NewPassword');
      expect(keyManager.vaultKey).toEqual(vaultKey);
      await keyManager.destroy();

      // Use a different key.
      keyManager = await KeyManager.createKeyManager({
        password: 'NewPassword',
        keysPath,
        logger,
      });
      expect(keyManager.vaultKey).toEqual(vaultKey);
      await keyManager.destroy();
    });
  });
  test('KeyManager generates a valid NodeId', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const nodeId = keyManager.getNodeId();
    isNodeId(nodeId);
    makeNodeId(nodeId);
  });
  test('destroying the KeyManager prevents any further method calls.', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = await KeyManager.createKeyManager({
      password: 'Password',
      keysPath,
      logger,
    });
    await keyManager.destroy();
    await expect(keyManager.renewRootKeyPair('NewPassword')).rejects.toThrow();
  });
});
