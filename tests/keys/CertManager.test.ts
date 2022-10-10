import type { Key } from '@/keys/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { testProp, fc } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import CertManager from '@/keys/CertManager';
import * as keysUtils from '@/keys/utils';
import * as keysErrors from '@/keys/errors';
import * as utils from '@/utils';
import * as testsKeysUtils from './utils';

describe(CertManager.name, () => {
  const password = keysUtils.getRandomBytes(10).toString('utf-8');
  const privateKey = keysUtils.generateKeyPair().privateKey;
  const logger = new Logger(`${CertManager.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      privateKey,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
    });
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
    });
  });
  afterEach(async () => {
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('CertManager readiness', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });
    await expect(async () => {
      await certManager.destroy();
    }).rejects.toThrow(keysErrors.ErrorCertManagerRunning);
    // Should be a noop
    await certManager.start();
    await certManager.stop();
    await certManager.destroy();
    await expect(certManager.start()).rejects.toThrow(
      keysErrors.ErrorCertManagerDestroyed,
    );
    await expect(async () => {
      await certManager.getCert();
    }).rejects.toThrow(keysErrors.ErrorCertManagerNotRunning);
  });
  test('constructs root cert, root certs', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });
    const rootCertPem = certManager.getCertPem();
    expect(typeof rootCertPem).toBe('string');
    const rootCertPems = await certManager.getCertChainPems();
    expect(rootCertPems.length).toBe(1);
    const rootCertChainPem = await certManager.getRootCertChainPem();
    expect(typeof rootCertChainPem).toBe('string');
    await certManager.stop();
  });
  test('reset root certificate with existing key pair', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });
    const keyPair1 = keyRing.keyPair;
    const rootCert1 = certManager.getCert();

    // We now use IdSortable, this means the next ID is always oging to be higher
    // no need to set the time

    await certManager.resetCertWithExistingKeyPair();

    const rootCert2 = certManager.getCert();

    // The key pair has not changed
    expect(keyRing.keyPair).toStrictEqual(keyPair1);

    // The serial number should be greater
    expect(rootCert2.serialNumber).toBeGreaterThan(rootCert1.serialNumber);

    expect(rootCert1.validity.notBefore < rootCert2.validity.notBefore).toBe(
      true,
    );

    expect(rootCert1.validity.notAfter < rootCert2.validity.notAfter).toBe(
      true,
    );
    await certManager.stop();
  });
  test('reset root certificate with new key pair', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });

    const rootKeyPair1 = certManager.getKeyPair();
    const rootCert1 = certManager.getCert();

    await certManager.resetCertWithNewKeyPair('password');

    const rootKeyPair2 = certManager.getRootKeyPair();
    const rootCert2 = certManager.getCert();

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

    await certManager.stop();
  });
  test('renew root certificate with new key pair', async () => {});
  test('order of certificate chain should be leaf to root', async () => {});
});
