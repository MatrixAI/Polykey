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
import TaskManager from '@/tasks/TaskManager';
import * as keysUtils from '@/keys/utils';
import * as keysErrors from '@/keys/errors';
import * as utils from '@/utils';
import * as testsKeysUtils from './utils';
import * as testsUtils from '../utils';

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
  let taskManager: TaskManager;
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
      strictMemoryLock: false,
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
    taskManager = await TaskManager.createTaskManager({ db, logger });
  });
  afterEach(async () => {
    await taskManager.stop();
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
      taskManager,
      logger,
      lazy: true
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
  test('constructs 1 current certificate at start', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      taskManager,
      logger,
      lazy: true,
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
      taskManager,
      logger,
      lazy: true,
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
      taskManager,
      logger,
      lazy: true,
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
      taskManager,
      logger,
      lazy: true,
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
  test('garbage collecting 0-duration certificates', async () => {
    const certMgr = await CertManager.createCertManager({
      db,
      keyRing,
      taskManager,
      logger,
      lazy: true,
    });
    const now = new Date();
    // 0-duration certificate will be valid now
    await certMgr.renewCertWithCurrentKeyPair(0, now);
    const cert2 = await certMgr.getCurrentCert();
    // The certificate is still valid for now, but it does have a duration of 0
    expect(keysUtils.certNotExpiredBy(cert2, now)).toBe(true);
    expect(keysUtils.certRemainingDuration(cert2)).toBe(0);
    // Until we advance the time by 1 second
    await utils.sleep(1000);
    // Then at this point, the previous certificate is expired
    // and the first certificate will be deleted
    await certMgr.renewCertWithCurrentKeyPair(100);
    // We expect to see 2 certificates
    // the third current certificate and the second expired certificate
    // the first certificate would have been deleted
    const cert3 = await certMgr.getCurrentCert();
    const certs = await certMgr.getCertsChain();
    expect(certs).toHaveLength(2);
    expect(keysUtils.certEqual(certs[0], cert3)).toBe(true);
    // The second certificate is in fact expired
    expect(keysUtils.certEqual(certs[1], cert2)).toBe(true);
    expect(keysUtils.certRemainingDuration(certs[1])).toBe(0);
    expect(keysUtils.certNotExpiredBy(certs[1], new Date())).toBe(false);
    await certMgr.stop();
  });
  test('automatic background certificate renewal', async () => {
    const certMgr = await CertManager.createCertManager({
      db,
      keyRing,
      taskManager,
      logger,
    });
    // Renew certificate with 1 second duration
    const certOld = await certMgr.renewCertWithCurrentKeyPair(1);
    // Wait 1.5 seconds for the automatic renewal to have occurred due to the 1 second delay
    await utils.sleep(1500);
    const certNew = await certMgr.getCurrentCert();
    // New certificate with have a greater `CertId`
    expect(keysUtils.certCertId(certNew)! > keysUtils.certCertId(certOld)!).toBe(true);
    // Same key pair preserves the NodeId
    expect(keysUtils.certNodeId(certNew)).toStrictEqual(keysUtils.certNodeId(certOld));
    // New certificate issued by old certificate
    expect(keysUtils.certIssuedBy(certNew, certOld)).toBe(true);
    // New certificate signed by old certificate
    expect(await keysUtils.certSignedBy(certNew, keysUtils.certPublicKey(certOld)!)).toBe(true);
    // New certificate is self-signed via the node signature extension
    expect(await keysUtils.certNodeSigned(certNew)).toBe(true);
    await certMgr.stop();
  });
  describe('model-check renewing and resetting the certificates', () => {
    testProp(
      'renewing and resetting with current key pair',
      [
        fc.commands(
          [
            // Sleep command
            fc.integer({ min: 250, max: 250 }).map(
              (ms) => new testsUtils.SleepCommand(ms)
            ),
            fc.integer({ min: 0, max: 2 }).map(
              (d) => new testsKeysUtils.RenewCertWithCurrentKeyPairCommand(d)
            ),
            fc.integer({ min: 0, max: 3 }).map(
              (d) => new testsKeysUtils.ResetCertWithCurrentKeyPairCommand(d)
            ),
          ],
        ),
      ],
      async (cmds) => {
        // Start a fresh certificate manager for each property test
        // ensure that we are using lazy to avoid testing the background task
        const certMgr = await CertManager.createCertManager({
          db,
          keyRing,
          taskManager,
          logger,
          lazy: true,
          fresh: true
        });
        try {
          const model = {
            certs: [await certMgr.getCurrentCert()],
          };
          const modelSetup = async () => {
            return {
              model,
              real: certMgr,
            };
          };
          await fc.asyncModelRun(modelSetup, cmds);
        } finally {
          await certMgr.stop();
        }
      },
      {
        numRuns: 10,
      }
    );
    testProp(
      'renewing and resetting with new key pair',
      [
        fc.commands(
          [
            // Sleep command
            fc.integer({ min: 250, max: 250 }).map(
              (ms) => new testsUtils.SleepCommand(ms)
            ),
            fc.tuple(
              testsKeysUtils.passwordArb,
              fc.integer({ min: 0, max: 2 }),
            ).map(([p, d]) =>
              new testsKeysUtils.RenewCertWithNewKeyPairCommand(p, d)
            ),
            fc.tuple(
              testsKeysUtils.passwordArb,
              fc.integer({ min: 0, max: 3 }),
            ).map(([p, d]) =>
              new testsKeysUtils.ResetCertWithNewKeyPairCommand(p, d)
            ),
          ],
        ),
      ],
      async (cmds) => {
        // Start a fresh certificate manager for each property test
        // ensure that we are using lazy to avoid testing the background task
        const certMgr = await CertManager.createCertManager({
          db,
          keyRing,
          taskManager,
          logger,
          lazy: true,
          fresh: true
        });
        try {
          const model = {
            certs: [await certMgr.getCurrentCert()],
          };
          const modelSetup = async () => {
            return {
              model,
              real: certMgr,
            };
          };
          await fc.asyncModelRun(modelSetup, cmds);
        } finally {
          await certMgr.stop();
        }
      },
      {
        numRuns: 10,
      }
    );
    testProp(
      'renewing with current and new key pair',
      [
        fc.commands(
          [
            // Sleep command
            fc.integer({ min: 250, max: 250 }).map(
              (ms) => new testsUtils.SleepCommand(ms)
            ),
            fc.integer({ min: 0, max: 2 }).map(
              (d) => new testsKeysUtils.RenewCertWithCurrentKeyPairCommand(d)
            ),
            fc.tuple(
              testsKeysUtils.passwordArb,
              fc.integer({ min: 0, max: 2 }),
            ).map(([p, d]) =>
              new testsKeysUtils.RenewCertWithNewKeyPairCommand(p, d)
            ),
          ],
        ),
      ],
      async (cmds) => {
        // Start a fresh certificate manager for each property test
        // ensure that we are using lazy to avoid testing the background task
        const certMgr = await CertManager.createCertManager({
          db,
          keyRing,
          taskManager,
          logger,
          lazy: true,
          fresh: true
        });
        try {
          const model = {
            certs: [await certMgr.getCurrentCert()],
          };
          const modelSetup = async () => {
            return {
              model,
              real: certMgr,
            };
          };
          await fc.asyncModelRun(modelSetup, cmds);
        } finally {
          await certMgr.stop();
        }
      },
      {
        numRuns: 10,
      }
    );
    testProp(
      'resetting with current and new key pair',
      [
        fc.commands(
          [
            // Sleep command
            fc.integer({ min: 250, max: 250 }).map(
              (ms) => new testsUtils.SleepCommand(ms)
            ),
            fc.integer({ min: 0, max: 2 }).map(
              (d) => new testsKeysUtils.ResetCertWithCurrentKeyPairCommand(d)
            ),
            fc.tuple(
              testsKeysUtils.passwordArb,
              fc.integer({ min: 0, max: 3 }),
            ).map(([p, d]) =>
              new testsKeysUtils.ResetCertWithNewKeyPairCommand(p, d)
            ),
          ],
        ),
      ],
      async (cmds) => {
        // Start a fresh certificate manager for each property test
        // ensure that we are using lazy to avoid testing the background task
        const certMgr = await CertManager.createCertManager({
          db,
          keyRing,
          taskManager,
          logger,
          lazy: true,
          fresh: true
        });
        try {
          const model = {
            certs: [await certMgr.getCurrentCert()],
          };
          const modelSetup = async () => {
            return {
              model,
              real: certMgr,
            };
          };
          await fc.asyncModelRun(modelSetup, cmds);
        } finally {
          await certMgr.stop();
        }
      },
      {
        numRuns: 10,
      }
    );
    testProp(
      'renewing and resetting with current and new key pair',
      [
        fc.commands(
          [
            // Sleep command
            fc.integer({ min: 250, max: 250 }).map(
              (ms) => new testsUtils.SleepCommand(ms)
            ),
            fc.integer({ min: 0, max: 2 }).map(
              (d) => new testsKeysUtils.RenewCertWithCurrentKeyPairCommand(d)
            ),
            fc.integer({ min: 0, max: 3 }).map(
              (d) => new testsKeysUtils.ResetCertWithCurrentKeyPairCommand(d)
            ),
            fc.tuple(
              testsKeysUtils.passwordArb,
              fc.integer({ min: 0, max: 2 }),
            ).map(([p, d]) =>
              new testsKeysUtils.RenewCertWithNewKeyPairCommand(p, d)
            ),
            fc.tuple(
              testsKeysUtils.passwordArb,
              fc.integer({ min: 0, max: 3 }),
            ).map(([p, d]) =>
              new testsKeysUtils.ResetCertWithNewKeyPairCommand(p, d)
            ),
          ],
        ),
      ],
      async (cmds) => {
        // Start a fresh certificate manager for each property test
        // ensure that we are using lazy to avoid testing the background task
        const certMgr = await CertManager.createCertManager({
          db,
          keyRing,
          taskManager,
          logger,
          lazy: true,
          fresh: true
        });
        try {
          const model = {
            certs: [await certMgr.getCurrentCert()],
          };
          const modelSetup = async () => {
            return {
              model,
              real: certMgr,
            };
          };
          await fc.asyncModelRun(modelSetup, cmds);
        } finally {
          await certMgr.stop();
        }
      },
      {
        numRuns: 10,
      }
    );
  });
});
