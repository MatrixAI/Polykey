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
    const rootKeyPairPem = keyManager.getRootKeyPairPem();
    expect(rootKeyPairPem).not.toBeUndefined();
    const rootCertPem = keyManager.getRootCertPem();
    expect(rootCertPem).not.toBeUndefined();
    const rootCertPems = await keyManager.getRootCertChainPems();
    expect(rootCertPems.length).toBe(1);
    const rootCertChainPem = await keyManager.getRootCertChainPem();
    expect(rootCertChainPem).not.toBeUndefined();
    await keyManager.stop();
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
    await keyManager.stop();
    keyManager.unsetWorkerManager();
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
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    const rootKeyPair1 = keyManager.getRootKeyPair();
    const rootCert1 = keyManager.getRootCert();
    await sleep(2000); // Let's just make sure there is time diff
    await db.put(['test', 'hello'], 'world');
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
    expect(await db.get(['test', 'hello'])).toBe('world');
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
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    const rootKeyPair1 = keyManager.getRootKeyPair();
    const rootCert1 = keyManager.getRootCert();
    await sleep(2000); // Let's just make sure there is time diff
    await db.put(['test', 'hello'], 'world');
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
    expect(await db.get(['test', 'hello'])).toBe('world');
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
});
