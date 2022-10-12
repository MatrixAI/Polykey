import type { Key } from '@/keys/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import CertManager from '@/keys/CertManager';
import * as keysUtils from '@/keys/utils';
import * as keysErrors from '@/keys/errors';
import * as utils from '@/utils';
import { sleep } from '@/utils';
import { Certificate } from '@/keys/types';

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
      await certManager.getCurrentCert();
    }).rejects.toThrow(keysErrors.ErrorCertManagerNotRunning);
  });
  test('constructs root cert, root certs', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });
    const rootCertPem = await certManager.getCurrentCertPEM();
    expect(typeof rootCertPem).toBe('string');
    const rootCertPems = await certManager.getCertPEMsChain();
    expect(rootCertPems.length).toBe(1);
    const rootCertChainPem = await certManager.getCertPEMsChainPEM();
    expect(typeof rootCertChainPem).toBe('string');
    await certManager.stop();
  });
  test('reset root certificate with existing key pair', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });
    const keyPairPem1 = keysUtils.keyPairToPEM(keyRing.keyPair);
    const rootCert1 = await certManager.getCurrentCert();

    // We now use IdSortable, this means the next ID is always going to be higher
    // no need to set the time
    await sleep(2000);
    await certManager.resetCertWithCurrentKeyPair();

    const rootCert2 = await certManager.getCurrentCert();

    // The key pair has not changed
    expect(keysUtils.keyPairToPEM(keyRing.keyPair)).toStrictEqual(keyPairPem1);

    // The serial number should be greater
    expect(keysUtils.certCertId(rootCert2)!.toBuffer().compare(keysUtils.certCertId(rootCert1)!.toBuffer())).toBe(1);
    expect(rootCert1.notBefore).toBeBefore(rootCert2.notBefore);
    expect(rootCert1.notAfter).toBeBefore(rootCert2.notAfter);
    await certManager.stop();
  });
  test('reset root certificate with new key pair', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });

    const rootKeyPairPem1 = keysUtils.keyPairToPEM(keyRing.keyPair);
    const publicKeyPem1 = keysUtils.publicKeyToPEM(keyRing.keyPair.publicKey);
    const rootCert1 = await certManager.getCurrentCert();

    await sleep(2000);
    await certManager.resetCertWithNewKeyPair('password');

    const rootKeyPairPem2 = keysUtils.keyPairToPEM(keyRing.keyPair);
    const publicKeyPem2 = keysUtils.publicKeyToPEM(keyRing.keyPair.publicKey);
    const rootCert2 = await certManager.getCurrentCert();

    expect(rootCert1.serialNumber).not.toBe(rootCert2.serialNumber);
    expect(rootCert1.notBefore).toBeBefore(rootCert2.notBefore)
    expect(rootCert1.notAfter).toBeBefore(rootCert2.notAfter)
    expect(rootKeyPairPem1).not.toBe(rootKeyPairPem2);

    expect(keysUtils.publicKeyToPEM(keysUtils.certPublicKey(rootCert1)!)).toBe(publicKeyPem1);
    expect(keysUtils.publicKeyToPEM(keysUtils.certPublicKey(rootCert2)!)).toBe(publicKeyPem2);

    await certManager.stop();
  });
  test('renew root certificate with new key pair', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });

    const publicKeyPem1 = keysUtils.publicKeyToPEM(keyRing.keyPair.publicKey);
    const keyPairPem1 = keysUtils.keyPairToPEM(keyRing.keyPair);
    const rootCert1 = await certManager.getCurrentCert();

    await sleep(2000);
    await certManager.renewCertWithNewKeyPair('password');

    const publicKeyPem2 = keysUtils.publicKeyToPEM(keyRing.keyPair.publicKey);
    const keyPairPem2 = keysUtils.keyPairToPEM(keyRing.keyPair)

    const rootCert2 = await certManager.getCurrentCert();

    expect(rootCert1.serialNumber).not.toBe(rootCert2.serialNumber);
    expect(rootCert1.notBefore).toBeBefore(rootCert2.notBefore)
    expect(rootCert1.notAfter).toBeBefore(rootCert2.notAfter)
    expect(keyPairPem1).not.toBe(keyPairPem2);

    expect(publicKeyPem1).not.toBe(publicKeyPem2);
    expect(keysUtils.publicKeyToPEM(keysUtils.certPublicKey(rootCert2)!)).toBe(publicKeyPem2);

    await certManager.stop();
  });
  test('order of certificate chain should be leaf to root', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });

    try {
      const certs: Array<Certificate> = [];
      certs.push(await certManager.getCurrentCert());

      for (let i = 0; i < 20; i++) {
        await certManager.renewCertWithNewKeyPair('password');
        certs.push(await certManager.getCurrentCert())
      }

      // ordered newest to oldest
      const reversedCerts = certs.reverse();
      const certChain = await certManager.getCertsChain();

      for (let i = 0; i < certChain.length; i++) {
        expect(certChain[i].equal(reversedCerts[i]));
      }
    } finally {
      await certManager.stop();
    }
  });
  test('certificate PEM matches format', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });

    const certificatePEM = await certManager.getCurrentCertPEM();

    const validPEM = /-----BEGIN CERTIFICATE-----\n(([A-Za-z0-9+\/=]+)\n)+-----END CERTIFICATE-----\n/
    expect(certificatePEM).toMatch(validPEM);

    await certManager.stop();
  });
  test('certificate chain PEM matches format',  async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });

    await certManager.renewCertWithNewKeyPair('password');
    await certManager.renewCertWithNewKeyPair('password');
    const certificateChainPEM = await certManager.getCertPEMsChainPEM();
    const validPEM = /(-----BEGIN CERTIFICATE-----\n(([A-Za-z0-9+\/=]+)\n)+-----END CERTIFICATE-----\n)/
    expect(certificateChainPEM).toMatch(validPEM);

    await certManager.stop();
  });
});
