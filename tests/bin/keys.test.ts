import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as utils from './utils';

import { PolykeyAgent } from '@';
import { commands } from 'commander';

const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
let dataDir: string;
let polykeyAgent: PolykeyAgent;
let passwordFile: string;
let command: Array<string>;
const jwtTokenExitCode = 77;

describe('CLI keys', () => {
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = new PolykeyAgent({
      nodePath: dataDir,
      logger: logger,
    });
    await polykeyAgent.start({
      password: 'password',
    });

    // Authorize session
    await utils.pk([
      'agent',
      'unlock',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
  });

  afterEach(async () => {
    // Lock Client
    await utils.pk(['agent', 'lock', '-np', dataDir]);
    // Perform call
    const result = await utils.pk(command);
    expect(result).toBe(jwtTokenExitCode);

    await polykeyAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  describe('commandCertChain', () => {
    test('should get the certificate chain', async () => {
      command = ['keys', 'certchain', '-np', dataDir];
      const result = await utils.pk([...command]);
      expect(result).toBe(0);
    });
  });
  describe('commandGetCert', () => {
    test('should get the certificate', async () => {
      command = ['keys', 'cert', '-np', dataDir];
      const result = await utils.pk([...command]);
      expect(result).toBe(0);
    });
  });
  describe('commandGetRootKeypair', () => {
    test('should get the root keypair', async () => {
      command = ['keys', 'root', '-np', dataDir];
      const result = await utils.pk([...command]);
      expect(result).toBe(0);

      const result2 = await utils.pk([...command, '-pk']);
      expect(result2).toBe(0);
    });
  });
  describe('commandChangePassword', () => {
    test('should change the root password', async () => {
      const passPath = path.join(dataDir, 'passwordChange');
      await fs.promises.writeFile(passPath, 'password-change');

      await polykeyAgent.stop();
      await polykeyAgent.start({ password: 'password' });

      command = ['keys', 'password', '-np', dataDir, '-pp', passPath];

      const result2 = await utils.pk([...command]);
      expect(result2).toBe(0);

      await polykeyAgent.stop();
      await polykeyAgent.start({ password: 'password-change' });
    });
  });
  describe('commandEncryptKeys', () => {
    test('should encrypt data', async () => {
      const dataPath = path.join(dataDir, 'data');
      await fs.promises.writeFile(dataPath, 'encrypt-me', {
        encoding: 'binary',
      });
      command = ['keys', 'encrypt', '-np', dataDir, '-fp', dataPath];
      const result = await utils.pk([...command]);
      expect(result).toBe(0);
    });
  });
  describe('commandDecryptKeys', () => {
    test('should decrypt data', async () => {
      const dataPath = path.join(dataDir, 'data');
      const secret = Buffer.from('this is the secret', 'binary');
      const encrypted = await polykeyAgent.keys.encryptWithRootKeyPair(secret);
      await fs.promises.writeFile(dataPath, encrypted, { encoding: 'binary' });
      command = ['keys', 'decrypt', '-np', dataDir, '-fp', dataPath];
      const result = await utils.pk([...command]);
      expect(result).toBe(0);
    });
  });
  describe('commandRenewKeypair', () => {
    test('should renew the keypair', async () => {
      const rootKeypairOld = polykeyAgent.keys.getRootKeyPair();
      const passPath = path.join(dataDir, 'passwordNew');
      await fs.promises.writeFile(passPath, 'password-new');

      command = ['keys', 'renew', '-np', dataDir, '-pp', passPath];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);

      const rootKeypairNew = polykeyAgent.keys.getRootKeyPair();
      expect(rootKeypairNew.privateKey).not.toBe(rootKeypairOld.privateKey);
      expect(rootKeypairNew.publicKey).not.toBe(rootKeypairOld.publicKey);

      await polykeyAgent.stop();
      await polykeyAgent.start({ password: 'password-new' });
    });
  });

  describe('commandResetKeyPair', () => {
    test('should reset the keypair', async () => {
      const rootKeypairOld = polykeyAgent.keys.getRootKeyPair();
      const passPath = path.join(dataDir, 'passwordNew');
      await fs.promises.writeFile(passPath, 'password-new');

      command = ['keys', 'reset', '-np', dataDir, '-pp', passPath];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);

      const rootKeypairNew = polykeyAgent.keys.getRootKeyPair();
      expect(rootKeypairNew.privateKey).not.toBe(rootKeypairOld.privateKey);
      expect(rootKeypairNew.publicKey).not.toBe(rootKeypairOld.publicKey);

      await polykeyAgent.stop();
      await polykeyAgent.start({ password: 'password-new' });
    });
  });

  describe('commandSignKeys', () => {
    test('should sign a file', async () => {
      const dataPath = path.join(dataDir, 'data');
      await fs.promises.writeFile(dataPath, 'sign-me', { encoding: 'binary' });

      command = ['keys', 'sign', '-np', dataDir, '-fp', dataPath];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);
    });
  });

  describe('commandVerifyKeys', () => {
    test('should verify a file', async () => {
      const dataPath = path.join(dataDir, 'data');
      await fs.promises.writeFile(dataPath, 'sign-me', { encoding: 'binary' });
      const signed = await polykeyAgent.keys.signWithRootKeyPair(
        Buffer.from('sign-me', 'binary'),
      );
      const signatureTrue = path.join(dataDir, 'data2');
      await fs.promises.writeFile(signatureTrue, signed, {
        encoding: 'binary',
      });

      command = [
        'keys',
        'verify',
        '-np',
        dataDir,
        '-fp',
        dataPath,
        '-sp',
        signatureTrue,
      ];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);
    });
  });
});
