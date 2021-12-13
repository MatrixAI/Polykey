import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as utils from './utils';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

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
  let passwordFile: string;
  let nodePath: string;
  let command: Array<string>;

  // Constants
  const password = 'password';

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    nodePath = path.join(dataDir, 'node');

    await fs.promises.writeFile(passwordFile, password);
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: nodePath,
      logger: logger,
    });
  }, global.polykeyStartupTimeout * 2);
  afterAll(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  beforeEach(async () => {
    // Authorize session
    await utils.pkStdio(
      ['agent', 'unlock', '-np', nodePath, '--password-file', passwordFile],
      {},
      dataDir,
    );
  });

  describe('commandCertChain', () => {
    test('should get the certificate chain', async () => {
      command = ['keys', 'certchain', '-np', nodePath];
      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
    });
  });
  describe('commandGetCert', () => {
    test('should get the certificate', async () => {
      command = ['keys', 'cert', '-np', nodePath];
      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
    });
  });
  describe('commandGetRootKeypair', () => {
    test('should get the root keypair', async () => {
      command = ['keys', 'root', '-np', nodePath];
      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      const result2 = await utils.pkStdio([...command, '-pk'], {}, dataDir);
      expect(result2.exitCode).toBe(0);
    });
  });
  describe('commandEncryptKeys', () => {
    test('should encrypt data', async () => {
      const dataPath = path.join(nodePath, 'data');
      await fs.promises.writeFile(dataPath, 'encrypt-me', {
        encoding: 'binary',
      });
      command = ['keys', 'encrypt', '-np', nodePath, dataPath];
      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
    });
  });
  describe('commandDecryptKeys', () => {
    test('should decrypt data', async () => {
      const dataPath = path.join(nodePath, 'data');
      const secret = Buffer.from('this is the secret', 'binary');
      const encrypted = await polykeyAgent.keyManager.encryptWithRootKeyPair(
        secret,
      );
      await fs.promises.writeFile(dataPath, encrypted, { encoding: 'binary' });
      command = ['keys', 'decrypt', '-np', nodePath, dataPath];
      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
    });
  });
  describe('commandSignKeys', () => {
    test('should sign a file', async () => {
      const dataPath = path.join(nodePath, 'data');
      await fs.promises.writeFile(dataPath, 'sign-me', { encoding: 'binary' });

      command = ['keys', 'sign', '-np', nodePath, dataPath];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
    });
  });
  describe('commandVerifyKeys', () => {
    test('should verify a file', async () => {
      const dataPath = path.join(nodePath, 'data');
      await fs.promises.writeFile(dataPath, 'sign-me', { encoding: 'binary' });
      const signed = await polykeyAgent.keyManager.signWithRootKeyPair(
        Buffer.from('sign-me', 'binary'),
      );
      const signatureTrue = path.join(nodePath, 'data2');
      await fs.promises.writeFile(signatureTrue, signed, {
        encoding: 'binary',
      });

      command = ['keys', 'verify', '-np', nodePath, dataPath, signatureTrue];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('commandRenewKeypair', () => {
    test(
      'should renew the keypair',
      async () => {
        // Starting new node.

        const rootKeypairOld = polykeyAgent.keyManager.getRootKeyPair();
        const passPath = path.join(dataDir, 'passwordNew');
        await fs.promises.writeFile(passPath, 'password-new');

        command = ['keys', 'renew', '-np', nodePath, '-pnf', passPath];

        const result = await utils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(0);

        const rootKeypairNew = polykeyAgent.keyManager.getRootKeyPair();
        expect(rootKeypairNew.privateKey).not.toBe(rootKeypairOld.privateKey);
        expect(rootKeypairNew.publicKey).not.toBe(rootKeypairOld.publicKey);

        await polykeyAgent.stop();

        polykeyAgent = await PolykeyAgent.createPolykeyAgent({
          password: 'password-new',
          nodePath: nodePath,
          logger: logger,
        });
        await polykeyAgent.keyManager.changePassword(password);
      },
      global.polykeyStartupTimeout * 4,
    );
  });
  describe('commandResetKeyPair', () => {
    test(
      'should reset the keypair',
      async () => {
        const rootKeypairOld = polykeyAgent.keyManager.getRootKeyPair();
        const passPath = path.join(dataDir, 'passwordNewNew');
        await fs.promises.writeFile(passPath, 'password-new-new');

        command = ['keys', 'reset', '-np', nodePath, '-pnf', passPath];

        const result = await utils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(0);

        const rootKeypairNew = polykeyAgent.keyManager.getRootKeyPair();
        expect(rootKeypairNew.privateKey).not.toBe(rootKeypairOld.privateKey);
        expect(rootKeypairNew.publicKey).not.toBe(rootKeypairOld.publicKey);

        await polykeyAgent.stop();

        polykeyAgent = await PolykeyAgent.createPolykeyAgent({
          password: 'password-new-new',
          nodePath: nodePath,
          logger: logger,
        });
        await polykeyAgent.keyManager.changePassword(password);
      },
      global.polykeyStartupTimeout * 4,
    );
  });
  describe('commandChangePassword', () => {
    test(
      'should change the root password',
      async () => {
        const passPath = path.join(dataDir, 'passwordChange');
        await fs.promises.writeFile(passPath, 'password-change');

        command = ['keys', 'password', '-np', nodePath, '-pnf', passPath];

        const result2 = await utils.pkStdio([...command], {}, dataDir);
        expect(result2.exitCode).toBe(0);

        await polykeyAgent.stop();

        polykeyAgent = await PolykeyAgent.createPolykeyAgent({
          password: 'password-change',
          nodePath: nodePath,
          logger: logger,
        });
        await polykeyAgent.keyManager.changePassword(password);
      },
      global.polykeyStartupTimeout * 4,
    );
  });
});
