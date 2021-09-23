import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as utils from './utils';

import { PolykeyAgent } from '@';

/**
 * This test file has been optimised to use only one instance of PolykeyAgent where posible.
 * Setting up the PolykeyAgent has been done in a beforeAll block.
 * Keep this in mind when adding or editing tests.
 * Any side effects need to be undone when the test has completed.
 * Preferably within a `afterEach()` since any cleanup will be skipped inside a failing test.
 *
 * - left over state can cause a test to fail in certain cases.
 * - left over state can cause similar tests to succeed when they should fail.
 * - starting or stopping the agent within tests should be done on a new instance of the polykey agent.
 * - when in doubt test each modified or added test on it's own as well as the whole file.
 * - Looking into adding a way to safely clear each domain's DB information with out breaking modules.
 */
describe('CLI keys', () => {
  const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
  let dataDir: string;
  let polykeyAgent: PolykeyAgent;
  let newPolykeyAgent1: PolykeyAgent;
  let newPolykeyAgent2: PolykeyAgent;
  let passwordFile: string;
  let nodePath: string;
  let newNodePath1: string;
  let newNodePath2: string;
  let command: Array<string>;

  // Constants
  const password = 'password';

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    nodePath = path.join(dataDir, 'node');
    newNodePath1 = path.join(dataDir, 'newNode1');
    newNodePath2 = path.join(dataDir, 'newNode2');

    await fs.promises.writeFile(passwordFile, password);
    polykeyAgent = await PolykeyAgent.createPolykey({
      nodePath: nodePath,
      logger: logger,
    });
    newPolykeyAgent1 = await PolykeyAgent.createPolykey({
      nodePath: newNodePath1,
      logger: logger,
    });
    newPolykeyAgent2 = await PolykeyAgent.createPolykey({
      nodePath: newNodePath2,
      logger: logger,
    });
    await polykeyAgent.start({ password });
    await newPolykeyAgent1.start({ password });
    await newPolykeyAgent2.start({ password });

    await utils.pkWithStdio([
      'agent',
      'unlock',
      '-np',
      newNodePath1,
      '--password-file',
      passwordFile,
    ]);
    await utils.pkWithStdio([
      'agent',
      'unlock',
      '-np',
      newNodePath2,
      '--password-file',
      passwordFile,
    ]);
  }, global.polykeyStartupTimeout * 2);
  afterAll(async () => {
    await polykeyAgent.stop();
    await newPolykeyAgent1.stop();
    await newPolykeyAgent2.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  beforeEach(async () => {
    // Authorize session
    await utils.pkWithStdio([
      'agent',
      'unlock',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
  });

  describe('commandCertChain', () => {
    test('should get the certificate chain', async () => {
      command = ['keys', 'certchain', '-np', nodePath];
      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);
    });
  });
  describe('commandGetCert', () => {
    test('should get the certificate', async () => {
      command = ['keys', 'cert', '-np', nodePath];
      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);
    });
  });
  describe('commandGetRootKeypair', () => {
    test('should get the root keypair', async () => {
      command = ['keys', 'root', '-np', nodePath];
      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);

      const result2 = await utils.pkWithStdio([...command, '-pk']);
      expect(result2.code).toBe(0);
    });
  });
  describe('commandEncryptKeys', () => {
    test('should encrypt data', async () => {
      const dataPath = path.join(nodePath, 'data');
      await fs.promises.writeFile(dataPath, 'encrypt-me', {
        encoding: 'binary',
      });
      command = ['keys', 'encrypt', '-np', nodePath, '-fp', dataPath];
      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);
    });
  });
  describe('commandDecryptKeys', () => {
    test('should decrypt data', async () => {
      const dataPath = path.join(nodePath, 'data');
      const secret = Buffer.from('this is the secret', 'binary');
      const encrypted = await polykeyAgent.keys.encryptWithRootKeyPair(secret);
      await fs.promises.writeFile(dataPath, encrypted, { encoding: 'binary' });
      command = ['keys', 'decrypt', '-np', nodePath, '-fp', dataPath];
      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);
    });
  });
  describe('commandSignKeys', () => {
    test('should sign a file', async () => {
      const dataPath = path.join(nodePath, 'data');
      await fs.promises.writeFile(dataPath, 'sign-me', { encoding: 'binary' });

      command = ['keys', 'sign', '-np', nodePath, '-fp', dataPath];

      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);
    });
  });
  describe('commandVerifyKeys', () => {
    test('should verify a file', async () => {
      const dataPath = path.join(nodePath, 'data');
      await fs.promises.writeFile(dataPath, 'sign-me', { encoding: 'binary' });
      const signed = await polykeyAgent.keys.signWithRootKeyPair(
        Buffer.from('sign-me', 'binary'),
      );
      const signatureTrue = path.join(nodePath, 'data2');
      await fs.promises.writeFile(signatureTrue, signed, {
        encoding: 'binary',
      });

      command = [
        'keys',
        'verify',
        '-np',
        nodePath,
        '-fp',
        dataPath,
        '-sp',
        signatureTrue,
      ];

      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);
    });
  });

  describe('commandRenewKeypair', () => {
    test('should renew the keypair', async () => {
      //Starting new node.

      const rootKeypairOld = polykeyAgent.keys.getRootKeyPair();
      const passPath = path.join(dataDir, 'passwordNew');
      await fs.promises.writeFile(passPath, 'password-new');

      command = ['keys', 'renew', '-np', nodePath, '-pp', passPath];

      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);

      const rootKeypairNew = polykeyAgent.keys.getRootKeyPair();
      expect(rootKeypairNew.privateKey).not.toBe(rootKeypairOld.privateKey);
      expect(rootKeypairNew.publicKey).not.toBe(rootKeypairOld.publicKey);

      await polykeyAgent.stop();
      await polykeyAgent.start({ password: 'password-new' });
    });
  });
  describe('commandResetKeyPair', () => {
    test('should reset the keypair', async () => {
      const rootKeypairOld = newPolykeyAgent1.keys.getRootKeyPair();
      const passPath = path.join(dataDir, 'passwordNewNew');
      await fs.promises.writeFile(passPath, 'password-new-new');

      command = ['keys', 'reset', '-np', newNodePath1, '-pp', passPath];

      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);

      const rootKeypairNew = newPolykeyAgent1.keys.getRootKeyPair();
      expect(rootKeypairNew.privateKey).not.toBe(rootKeypairOld.privateKey);
      expect(rootKeypairNew.publicKey).not.toBe(rootKeypairOld.publicKey);

      await newPolykeyAgent1.stop();
      await newPolykeyAgent1.start({ password: 'password-new-new' });

      await utils.pkWithStdio(['agent', 'lock', '-np', newNodePath1]);
    });
  });
  describe('commandChangePassword', () => {
    test(
      'should change the root password',
      async () => {
        const passPath = path.join(dataDir, 'passwordChange');
        await fs.promises.writeFile(passPath, 'password-change');

        await newPolykeyAgent2.stop();
        await newPolykeyAgent2.start({ password });

        command = ['keys', 'password', '-np', newNodePath2, '-pp', passPath];

        const result2 = await utils.pkWithStdio([...command]);
        expect(result2.code).toBe(0);

        await newPolykeyAgent2.stop();
        await newPolykeyAgent2.start({ password: 'password-change' });

        await utils.pkWithStdio(['agent', 'lock', '-np', newNodePath2]);
      },
      global.defaultTimeout * 2,
    );
  });
});
