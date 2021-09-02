import type { PublicKey } from '@/keys/types';

import fs from 'fs';
import os from 'os';
import path from 'path';
import { Buffer } from 'buffer';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import KeyManager from '@/keys/KeyManager';
import WorkerManager from '@/workers/WorkerManager';
import { DB } from '@/db';
import { sleep } from '@/utils';
import * as keysUtils from '@/keys/utils';
import * as keysErrors from '@/keys/errors';

describe('KeyManager', () => {
  const logger = new Logger('KeyManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
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
  test('construction has no side effects', async () => {
    const keysPath = `${dataDir}/keys`;
    new KeyManager({ keysPath, logger });
    await expect(fs.promises.stat(keysPath)).rejects.toThrow(/ENOENT/);
  });
  test('async start constructs root key pair and root cert and root certs', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    const keysPathContents = await fs.promises.readdir(keysPath);
    expect(keysPathContents).toContain('root.pub');
    expect(keysPathContents).toContain('root.key');
    expect(keysPathContents).toContain('root.crt');
    expect(keysPathContents).toContain('root_certs');
    await keyManager.stop();
  });
  test('can get root key pair and root cert', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
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
  test('uses WorkerManager for generating root key pair', async () => {
    const workerManager = new WorkerManager({ logger });
    await workerManager.start();
    const keysPath = `${dataDir}/keys`;
    const keyManager = new KeyManager({ keysPath, logger });
    keyManager.setWorkerManager(workerManager);
    await keyManager.start({ password: 'password' });
    const keysPathContents = await fs.promises.readdir(keysPath);
    expect(keysPathContents).toContain('root.pub');
    expect(keysPathContents).toContain('root.key');
    await keyManager.stop();
    keyManager.unsetWorkerManager();
    await workerManager.stop();
  });
  test('encrypting and decrypting with root key', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    const plainText = Buffer.from('abc');
    const cipherText = await keyManager.encryptWithRootKeyPair(plainText);
    const plainText_ = await keyManager.decryptWithRootKeyPair(cipherText);
    expect(plainText_.equals(plainText)).toBe(true);
    await keyManager.stop();
  });
  test('uses WorkerManager for encryption and decryption with root key', async () => {
    const workerManager = new WorkerManager({ logger });
    await workerManager.start();
    const keysPath = `${dataDir}/keys`;
    const keyManager = new KeyManager({ keysPath, logger });
    keyManager.setWorkerManager(workerManager);
    await keyManager.start({ password: 'password' });
    const plainText = Buffer.from('abc');
    const cipherText = await keyManager.encryptWithRootKeyPair(plainText);
    const plainText_ = await keyManager.decryptWithRootKeyPair(cipherText);
    expect(plainText_.equals(plainText)).toBe(true);
    await keyManager.stop();
    keyManager.unsetWorkerManager();
    await workerManager.stop();
  });
  test('encrypting beyond maximum size', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    // no way we can encrypt 1000 bytes without a ridiculous key size
    const plainText = Buffer.from(new Array(1000 + 1).join('A'));
    await expect(keyManager.encryptWithRootKeyPair(plainText)).rejects.toThrow(
      keysErrors.ErrorEncryptSize,
    );
    await keyManager.stop();
  });
  test('signing and verifying with root key', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    const data = Buffer.from('abc');
    const signature = await keyManager.signWithRootKeyPair(data);
    const signed = await keyManager.verifyWithRootKeyPair(data, signature);
    expect(signed).toBe(true);
    await keyManager.stop();
  });
  test('uses WorkerManager for signing and verifying with root key', async () => {
    const workerManager = new WorkerManager({ logger });
    await workerManager.start();
    const keysPath = `${dataDir}/keys`;
    const keyManager = new KeyManager({ keysPath, logger });
    keyManager.setWorkerManager(workerManager);
    await keyManager.start({ password: 'password' });
    const data = Buffer.from('abc');
    const signature = await keyManager.signWithRootKeyPair(data);
    const signed = await keyManager.verifyWithRootKeyPair(data, signature);
    expect(signed).toBe(true);
    await keyManager.stop();
    keyManager.unsetWorkerManager();
    await workerManager.stop();
  });
  test('can change root key password', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    await keyManager.changeRootKeyPassword('newpassword');
    await keyManager.stop();
    await expect(async () => {
      await keyManager.start({ password: 'password' });
      await keyManager.stop();
    }).rejects.toThrow(keysErrors.ErrorRootKeysParse);
    await expect(
      (async () => {
        await keyManager.start({ password: 'newpassword' });
        await keyManager.stop();
      })(),
    ).resolves.toBeUndefined();
  });
  test('can reset root certificate', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    const rootCert1 = keyManager.getRootCert();
    // we use seconds for sequence numbers
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
    const dbPath = `${dataDir}/db`;
    const keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    const db = new DB({ dbPath, logger });
    const rootKeyPair1 = keyManager.getRootKeyPair();
    const rootCert1 = keyManager.getRootCert();
    await sleep(2000); // let's just make sure there is time diff
    await db.start({ keyPair: rootKeyPair1 });
    await db.put(['test'], 'hello', 'world');
    // reset root key pair takes time
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
    await expect(db.start({ keyPair: rootKeyPair2 })).resolves.toBe(undefined);
    expect(await db.get(['test'], 'hello')).toBe('world');
    await keyManager.stop();
  });
  test('can renew root key pair', async () => {
    const keysPath = `${dataDir}/keys`;
    const dbPath = `${dataDir}/db`;
    const keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    const db = new DB({ dbPath, logger });
    const rootKeyPair1 = keyManager.getRootKeyPair();
    const rootCert1 = keyManager.getRootCert();
    await sleep(2000); // let's just make sure there is time diff
    // renew root key pair takes time
    await db.start({ keyPair: rootKeyPair1 });
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
    // all certificates are self-signed via an extension
    expect(keysUtils.certVerifiedNode(rootCert1)).toBe(true);
    expect(keysUtils.certVerifiedNode(rootCert2)).toBe(true);
    // cert chain is ensured
    expect(keysUtils.certIssued(rootCert1, rootCert2)).toBe(true);
    expect(keysUtils.certVerified(rootCert1, rootCert2)).toBe(true);

    //Testing DB.
    await expect(db.stop()).resolves.toBe(undefined);
    await expect(db.start({ keyPair: rootKeyPair2 })).resolves.toBe(undefined);
    expect(await db.get(['test'], 'hello')).toBe('world');

    await keyManager.stop();
  });
  test(
    'order of certificate chain should be leaf to root',
    async () => {
      const keysPath = `${dataDir}/keys`;
      const dbPath = `${dataDir}/db`;
      const keyManager = new KeyManager({ keysPath, logger });
      await keyManager.start({ password: 'password' });
      const db = new DB({ dbPath, logger });
      const rootKeyPair1 = keyManager.getRootKeyPair();
      const rootCertPem1 = keyManager.getRootCertPem();
      await sleep(2000); // let's just make sure there is time diff
      // renew root key pair takes time
      await db.start({ keyPair: rootKeyPair1 });
      await keyManager.renewRootKeyPair('newpassword');
      const rootCertPem2 = keyManager.getRootCertPem();
      await sleep(2000); // let's just make sure there is time diff
      // renew root key pair takes time
      await keyManager.renewRootKeyPair('newnewpassword');
      const rootCertPem3 = keyManager.getRootCertPem();
      const rootCertChainPems = await keyManager.getRootCertChainPems();
      const rootCertChainPem = await keyManager.getRootCertChainPem();
      const rootCertChain = await keyManager.getRootCertChain();
      // the order should be from leaf to root
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
    },
    global.defaultTimeout * 2 + 5000,
  );
});
