import type {
  Key,
  Certificate,
  CertificatePEM,
  CertificatePEMChain
} from '@/keys/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { testProp, fc } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import * as asynciterable from 'ix/asynciterable';
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
  let dbPath: string;
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
    dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              Buffer.from(key) as Key,
              Buffer.from(plainText),
            ).buffer;
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              Buffer.from(key) as Key,
              Buffer.from(cipherText),
            )?.buffer;
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
  test('constructs 1 current cert at start', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });
    const cert = await certManager.getCurrentCert();
    expect(keysUtils.certNodeId(cert)).toStrictEqual(keyRing.getNodeId());
    expect(keysUtils.certPublicKey(cert)).toStrictEqual(keyRing.keyPair.publicKey);
    expect(await keysUtils.certSignedBy(cert, keyRing.keyPair.publicKey)).toBe(true);
    expect(keysUtils.certIssuedBy(cert, cert)).toBe(true);
    expect(keysUtils.certNotExpiredBy(cert, new Date())).toBe(true);
    expect(await keysUtils.certNodeSigned(cert)).toBe(true);
    await certManager.stop();
  });
  test('get certificate and certificates chain', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });
    let cert: Certificate;
    let certs: Array<Certificate>;
    cert = await certManager.getCurrentCert();
    certs = await certManager.getCertsChain();
    const certOld = cert;
    const certId = keysUtils.certCertId(cert)!;
    expect(keysUtils.certEqual(
      (await certManager.getCert(certId))!,
      cert
    )).toBe(true);
    expect(certs).toHaveLength(1);
    expect(keysUtils.certEqual(certs[0], cert)).toBe(true);
    // After renewal there will be 2 certificates
    await certManager.renewCertWithNewKeyPair(password, 1000);
    cert = await certManager.getCurrentCert();
    certs = await certManager.getCertsChain();
    expect(keysUtils.certEqual(cert, certOld)).not.toBe(true);
    expect(keysUtils.certEqual(certs[1], certOld)).toBe(true);
    await certManager.stop();
  });
  test('get certificate PEM and PEMs', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });
    let certPEM: CertificatePEM;
    let certPEMs: Array<CertificatePEM>;
    let certChainPEM: CertificatePEMChain;
    const cert = await certManager.getCurrentCert();
    certPEM = await certManager.getCurrentCertPEM();
    expect(certPEM).toMatch(
      /-----BEGIN CERTIFICATE-----\n([A-Za-z0-9+/=\n]+)-----END CERTIFICATE-----\n/,
    );
    const currentCert = keysUtils.certFromPEM(certPEM)!;
    const currentCertPEM = certPEM;
    expect(keysUtils.certNodeId(currentCert)).toStrictEqual(keyRing.getNodeId());
    expect(keysUtils.certPublicKey(currentCert)).toStrictEqual(keyRing.keyPair.publicKey);
    expect(await keysUtils.certSignedBy(currentCert, keyRing.keyPair.publicKey)).toBe(true);
    expect(keysUtils.certIssuedBy(currentCert, currentCert)).toBe(true);
    expect(keysUtils.certNotExpiredBy(currentCert, new Date())).toBe(true);
    expect(await keysUtils.certNodeSigned(currentCert)).toBe(true);
    expect(keysUtils.certToPEM(cert)).toStrictEqual(certPEM);
    certPEMs = await certManager.getCertPEMsChain();
    expect(certPEMs).toHaveLength(1);
    expect(certPEMs[0]).toStrictEqual(certPEM);
    certChainPEM = await certManager.getCertPEMsChainPEM();
    expect(certChainPEM).toStrictEqual(certPEM);
    // After renewal there will be 2 certificates
    await certManager.renewCertWithNewKeyPair(password, 1000);
    certPEM = await certManager.getCurrentCertPEM();
    certPEMs = await certManager.getCertPEMsChain();
    certChainPEM = await certManager.getCertPEMsChainPEM();
    expect(certPEM).not.toStrictEqual(currentCertPEM);
    expect(certPEMs).toHaveLength(2);
    expect(
      keysUtils.certEqual(
        keysUtils.certFromPEM(certPEMs[1])!,
        cert
      )
    ).toBe(true);
    expect(certChainPEM).toMatch(
      /-----BEGIN CERTIFICATE-----\n([A-Za-z0-9+/=\n]+)-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\n([A-Za-z0-9+/=\n]+)-----END CERTIFICATE-----\n/,
    );
    await certManager.stop();
  });
  test('get certificate and certificates generator', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });
    // Only a single certificate will exist at the beginning
    let certs: Array<Certificate>;
    let certPEMs: Array<string>;
    let currentCert: Certificate;
    certs = await asynciterable.toArray(certManager.getCerts());
    currentCert = certs[0];
    expect(certs).toHaveLength(1);
    expect(keysUtils.certNodeId(currentCert)).toStrictEqual(keyRing.getNodeId());
    expect(keysUtils.certPublicKey(currentCert)).toStrictEqual(keyRing.keyPair.publicKey);
    expect(await keysUtils.certSignedBy(currentCert, keyRing.keyPair.publicKey)).toBe(true);
    expect(keysUtils.certIssuedBy(currentCert, currentCert)).toBe(true);
    expect(keysUtils.certNotExpiredBy(currentCert, new Date())).toBe(true);
    expect(await keysUtils.certNodeSigned(currentCert)).toBe(true);
    certPEMs = await asynciterable.toArray(certManager.getCertPEMs());
    expect(certPEMs).toHaveLength(1);
    expect(certPEMs[0]).toStrictEqual(keysUtils.certToPEM(currentCert!));
    // After renewal there will be 2 certificates
    await certManager.renewCertWithNewKeyPair(password, 1000);
    certs = await asynciterable.toArray(certManager.getCerts());
    certPEMs = await asynciterable.toArray(certManager.getCertPEMs());
    expect(certs).toHaveLength(2);
    currentCert = certs[0];
    expect(certPEMs).toHaveLength(2);
    // The new leaf certificate would be issued and signed by the prior certificate
    expect(keysUtils.certIssuedBy(currentCert, certs[1])).toBe(true);
    expect(
      await keysUtils.certSignedBy(
        currentCert,
        keysUtils.certPublicKey(certs[1])!
      )
    ).toBe(true);
    await certManager.stop();
  });
  testProp.only(
    'abc',
    [
      fc.commands(
        [
          // Renew with current key pair command
          fc.integer({ min: 0, max: 1000 }).map(
            (d) => new testsKeysUtils.RenewCertWithCurrentKeyPairCommand(d)
          ),
          // Renew with new key pair command
          fc.tuple(
            testsKeysUtils.passwordArb,
            fc.integer({ min: 0, max: 1000 }),
          ).map(([p, d]) =>
            new testsKeysUtils.RenewCertWithNewKeyPairCommand(p, d)
          ),
        ],
      ),
    ],
    async (cmds) => {
      // Start a fresh certificate manager for each property test
      const certMgr = await CertManager.createCertManager({
        db,
        keyRing,
        logger,
        fresh: true
      });
      const model = {
        certCount: 1,
        currentCert: await certMgr.getCurrentCert(),
      };
      const modelSetup = async () => {
        return {
          model,
          real: certMgr,
        };
      };
      await fc.asyncModelRun(modelSetup, cmds);
      await certMgr.stop();
    },
    {
      numRuns: 20,
    }
  );
  test('renew with current key pair', async () => {

    // we shouldd use fast check to iterate the number of renewals
    // to do this, we have to genrate commands
    // or whatever
    // however many renewals and shit

  });
  test('renew with new key pair', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });

    const publicKeyPem1 = keysUtils.publicKeyToPEM(keyRing.keyPair.publicKey);
    const keyPairPem1 = keysUtils.keyPairToPEM(keyRing.keyPair);
    const rootCert1 = await certManager.getCurrentCert();

    await utils.sleep(2000);
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
  test('reset with current key pair', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });
    const keyPairPem1 = keysUtils.keyPairToPEM(keyRing.keyPair);
    const rootCert1 = await certManager.getCurrentCert();

    // We now use IdSortable, this means the next ID is always going to be higher
    // no need to set the time
    await utils.sleep(2000);
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
  test('reset with new key pair', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });

    const rootKeyPairPem1 = keysUtils.keyPairToPEM(keyRing.keyPair);
    const publicKeyPem1 = keysUtils.publicKeyToPEM(keyRing.keyPair.publicKey);
    const rootCert1 = await certManager.getCurrentCert();

    await utils.sleep(2000);
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
  // test('order of certificate chain should be leaf to root', async () => {
  //   const certManager = await CertManager.createCertManager({
  //     db,
  //     keyRing,
  //     logger,
  //   });

  //   try {
  //     const certs: Array<Certificate> = [];
  //     certs.push(await certManager.getCurrentCert());

  //     for (let i = 0; i < 20; i++) {
  //       await certManager.renewCertWithNewKeyPair('password');
  //       certs.push(await certManager.getCurrentCert())
  //     }

  //     // ordered newest to oldest
  //     const reversedCerts = certs.reverse();
  //     const certChain = await certManager.getCertsChain();

  //     for (let i = 0; i < certChain.length; i++) {
  //       expect(certChain[i].equal(reversedCerts[i]));
  //     }
  //   } finally {
  //     await certManager.stop();
  //   }
  // });
});
