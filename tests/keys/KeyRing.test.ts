import fs from 'fs';
import os from 'os';
import path from 'path';
import { testProp } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import * as keysErrors from '@/keys/errors';
import * as testsKeysUtils from './utils';

describe(KeyRing.name, () => {
  const password = keysUtils.getRandomBytes(10).toString('utf-8');
  const logger = new Logger(`${KeyRing.name} Test`, LogLevel.WARN, [
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
  test('KeyRing readiness', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
      },
      logger,
    });
    await expect(async () => {
      await keyRing.destroy();
    }).rejects.toThrow(keysErrors.ErrorKeyRingRunning);
    // Should be a noop
    await keyRing.start({ password });
    await keyRing.stop();
    await keyRing.destroy();
    await expect(keyRing.start({ password })).rejects.toThrow(
      keysErrors.ErrorKeyRingDestroyed,
    );
    expect(() => {
      keyRing.keyPair;
    }).toThrow(keysErrors.ErrorKeyRingNotRunning);
    await expect(async () => {
      await keyRing.checkPassword(password);
    }).rejects.toThrow(keysErrors.ErrorKeyRingNotRunning);
  });
  test('constructs root key pair, and db key', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
      },
      logger,
    });
    const keysPathContents = await fs.promises.readdir(keysPath);
    expect(keysPathContents).toContain('public.jwk');
    expect(keysPathContents).toContain('private.jwk');
    expect(keysPathContents).toContain('db.jwk');
    expect(keyRing.keyPair.publicKey).toBeInstanceOf(Buffer);
    expect(keyRing.keyPair.publicKey.byteLength).toBe(32);
    expect(keyRing.keyPair.privateKey).toBeInstanceOf(Buffer);
    expect(keyRing.keyPair.privateKey.byteLength).toBe(32);
    expect(keyRing.dbKey).toBeInstanceOf(Buffer);
    expect(keyRing.dbKey.byteLength).toBe(32);
    await keyRing.stop();
  });
  test('start and stop is persistent', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
      },
      logger,
    });
    const nodeId = keyRing.getNodeId();
    const keyPair = {
      publicKey: Buffer.from(keyRing.keyPair.publicKey),
      privateKey: Buffer.from(keyRing.keyPair.privateKey),
      secretKey: Buffer.from(keyRing.keyPair.secretKey),
    };
    const dbKey = Buffer.from(keyRing.dbKey);
    expect(keyRing.recoveryCode).toBeDefined();
    await keyRing.stop();
    await keyRing.start({
      password,
    });
    expect(keyRing.getNodeId()).toStrictEqual(nodeId);
    expect(keyRing.keyPair).toStrictEqual(keyPair);
    expect(keyRing.recoveryCode).toBeUndefined();
    expect(keyRing.dbKey).toStrictEqual(dbKey);
    await keyRing.stop();
  });
  test('destroy deletes key pair and DB key', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
      },
      logger,
    });
    const keysPathContents1 = await fs.promises.readdir(keysPath);
    expect(keysPathContents1).toContain('public.jwk');
    expect(keysPathContents1).toContain('private.jwk');
    expect(keysPathContents1).toContain('db.jwk');
    await keyRing.stop();
    await keyRing.destroy();
    await expect(async () => {
      await fs.promises.readdir(keysPath);
    }).rejects.toThrow(/ENOENT/);
  });
  describe('password', () => {
    test('can check and change the password', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyRing = await KeyRing.createKeyRing({
        keysPath,
        password,
        options: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
        logger,
      });
      expect(await keyRing.checkPassword(password)).toBe(true);
      await keyRing.changePassword('new password');
      expect(await keyRing.checkPassword('new password')).toBe(true);
      await keyRing.stop();
    });
    test('changed password persists after restart', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyRing = await KeyRing.createKeyRing({
        keysPath,
        password: 'first password',
        logger,
        options: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
      });
      await keyRing.changePassword('second password');
      await keyRing.stop();
      await keyRing.start({
        password: 'second password',
      });
      expect(await keyRing.checkPassword('second password')).toBe(true);
      await keyRing.stop();
      await expect(async () => {
        await KeyRing.createKeyRing({
          password: 'wrong password',
          keysPath,
          options: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
          },
          logger,
        });
      }).rejects.toThrow(keysErrors.ErrorKeyPairParse);
    });
  });
  describe('recovery code', () => {
    test('creates a recovery code and can recover from the same code', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyRing = await KeyRing.createKeyRing({
        keysPath,
        password,
        options: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
        logger,
      });
      const nodeId = keyRing.getNodeId();
      const recoveryCode = keyRing.recoveryCode!;
      const keyPair = {
        publicKey: Buffer.from(keyRing.keyPair.publicKey),
        privateKey: Buffer.from(keyRing.keyPair.privateKey),
        secretKey: Buffer.from(keyRing.keyPair.secretKey),
      };
      expect(recoveryCode).toBeDefined();
      await keyRing.stop();
      // Suppose we forgot the password
      // Use the recovery code to recover and set the new password
      await keyRing.start({
        password: 'newpassword',
        recoveryCode,
      });
      expect(await keyRing.checkPassword('newpassword')).toBe(true);
      // Recovered NodeID
      expect(keyRing.getNodeId()).toStrictEqual(nodeId);
      // Recovered the key pair
      expect(keyRing.keyPair).toStrictEqual(keyPair);
      await keyRing.stop();
      await expect(async () => {
        // Use the wrong recovery code
        await keyRing.start({
          password: 'newpassword',
          recoveryCode: keysUtils.generateRecoveryCode(),
        });
      }).rejects.toThrow(keysErrors.ErrorKeysRecoveryCodeIncorrect);
      await keyRing.stop();
    });
    test('create deterministic keypair with recovery code', async () => {
      const recoveryCode = keysUtils.generateRecoveryCode();
      const keysPath1 = `${dataDir}/keys1`;
      const keyRing1 = await KeyRing.createKeyRing({
        password,
        keysPath: keysPath1,
        options: {
          recoveryCode,
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
        logger,
      });
      expect(keyRing1.recoveryCode).toBe(recoveryCode);
      const nodeId1 = keyRing1.getNodeId();
      await keyRing1.stop();
      const keysPath2 = `${dataDir}/keys2`;
      const keyRing2 = await KeyRing.createKeyRing({
        password,
        keysPath: keysPath2,
        options: {
          recoveryCode,
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
        logger,
      });
      expect(keyRing2.recoveryCode).toBe(recoveryCode);
      const nodeId2 = keyRing2.getNodeId();
      await keyRing2.stop();
      expect(nodeId1).toStrictEqual(nodeId2);
    });
  });
  describe('key pair', () => {
    test('rotate key pair changes the key pair and re-wraps the private key', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyRing = await KeyRing.createKeyRing({
        keysPath,
        password,
        options: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
        logger,
      });
      const keyPair = {
        publicKey: Buffer.from(keyRing.keyPair.publicKey),
        privateKey: Buffer.from(keyRing.keyPair.privateKey),
        secretKey: Buffer.from(keyRing.keyPair.secretKey),
      };
      await keyRing.rotateKeyPair('new password');
      expect(keyRing.keyPair).not.toStrictEqual(keyPair);
      await keyRing.stop();
      await keyRing.start({
        password: 'new password',
      });
      expect(keyRing.keyPair).not.toStrictEqual(keyPair);
      await keyRing.stop();
    });
  });
  describe('override key pair', () => {
    test('override key pair with private key', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyPair = keysUtils.generateKeyPair();
      const keyRing = await KeyRing.createKeyRing({
        keysPath,
        password,
        options: {
          privateKey: keyPair.privateKey,
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
        logger,
      });
      expect(keyRing.keyPair).toStrictEqual(keyPair);
      // There cannot be a recovery code if private key was supplied
      expect(keyRing.recoveryCode).toBeUndefined();
      await keyRing.stop();
    });
    test('override key pair with encrypted private key path', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyPair = keysUtils.generateKeyPair();
      const privateKeyJWK = keysUtils.privateKeyToJWK(keyPair.privateKey);
      const privateKeyJWE = keysUtils.wrapWithPassword(
        'newpassword',
        privateKeyJWK,
        keysUtils.passwordOpsLimits.min,
        keysUtils.passwordMemLimits.min,
      );
      await fs.promises.writeFile(
        `${dataDir}/private-key.jwe`,
        JSON.stringify(privateKeyJWE),
        'utf-8',
      );
      const keyRing = await KeyRing.createKeyRing({
        keysPath,
        password: 'newpassword',
        options: {
          privateKeyPath: `${dataDir}/private-key.jwe`,
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
        logger,
      });
      expect(keyRing.keyPair).toStrictEqual(keyPair);
      // There cannot be a recovery code if private key was supplied
      expect(keyRing.recoveryCode).toBeUndefined();
      // The password is used to unwrapping and then wrapping
      expect(await keyRing.checkPassword('newpassword')).toBe(true);
      await keyRing.stop();
    });
    test('override key pair with unencrypted private key path', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyPair = keysUtils.generateKeyPair();
      const privateKeyJWK = keysUtils.privateKeyToJWK(keyPair.privateKey);
      await fs.promises.writeFile(
        `${dataDir}/private-key.jwk`,
        JSON.stringify(privateKeyJWK),
        'utf-8',
      );
      const keyRing = await KeyRing.createKeyRing({
        keysPath,
        password: 'newpassword',
        options: {
          privateKeyPath: `${dataDir}/private-key.jwk`,
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
        logger,
      });
      expect(keyRing.keyPair).toStrictEqual(keyPair);
      // There cannot be a recovery code if private key was supplied
      expect(keyRing.recoveryCode).toBeUndefined();
      expect(await keyRing.checkPassword('newpassword')).toBe(true);
      await keyRing.stop();
    });
  });
  describe('encryption & decryption & signing & verification', () => {
    let dataDir: string;
    let keyRing: KeyRing;
    beforeAll(async () => {
      dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      const keysPath = `${dataDir}/keys`;
      keyRing = await KeyRing.createKeyRing({
        password,
        keysPath,
        options: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
        logger,
      });
    });
    afterAll(async () => {
      await keyRing.stop();
    });
    testProp(
      'encrypting and decrypting with root key',
      [testsKeysUtils.bufferArb({ minLength: 0, maxLength: 1024 })],
      async (plainText) => {
        const cipherText = keyRing.encrypt(
          keyRing.keyPair.publicKey,
          plainText,
        );
        const plainText_ = keyRing.decrypt(cipherText)!;
        expect(plainText_.equals(plainText)).toBe(true);
      },
    );
    testProp(
      'signing and verifying with root key',
      [testsKeysUtils.bufferArb({ minLength: 0, maxLength: 1024 })],
      async (data) => {
        const signature = keyRing.sign(data);
        const signed = keyRing.verify(
          keyRing.keyPair.publicKey,
          data,
          signature,
        );
        expect(signed).toBe(true);
      },
    );
  });
  describe('DB key', () => {
    test('DB key remains unchanged when rotating key pair', async () => {
      const keysPath = `${dataDir}/keys`;
      const keyRing = await KeyRing.createKeyRing({
        password,
        keysPath,
        options: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
        logger,
      });
      // Make a copy of the existing DB key
      const dbKey = Buffer.from(keyRing.dbKey);
      await keyRing.rotateKeyPair('new password');
      expect(keyRing.dbKey).toStrictEqual(dbKey);
      await keyRing.stop();
    });
  });
});
