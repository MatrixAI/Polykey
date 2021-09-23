import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utils from './utils';

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
describe('CLI secrets', () => {
  const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
  let dataDir: string;
  let polykeyAgent: PolykeyAgent;
  let passwordFile: string;
  let command: Array<string>;

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = await PolykeyAgent.createPolykey({
      nodePath: dataDir,
      logger: logger,
    });
    await polykeyAgent.start({
      password: 'password',
    });
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await polykeyAgent.stop();
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
      dataDir,
      '--password-file',
      passwordFile,
    ]);
  });

  describe('commandCreateSecret', () => {
    test('should create secrets', async () => {
      const vaultName = 'Vault1';
      const vault = await polykeyAgent.vaults.createVault(vaultName);

      const secretPath = path.join(dataDir, 'secret');
      await fs.promises.writeFile(secretPath, 'this is a secret');

      command = [
        'secrets',
        'create',
        '-np',
        dataDir,
        '-sp',
        `${vaultName}:MySecret`,
        '-fp',
        secretPath,
      ];

      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);

      const list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(['MySecret']);
      expect(await vault.getSecret('MySecret')).toStrictEqual(
        'this is a secret',
      );
    });
  });
  describe('commandDeleteSecret', () => {
    test('should delete secrets', async () => {
      const vaultName = 'Vault2';
      const vault = await polykeyAgent.vaults.createVault(vaultName);

      await vault.addSecret('MySecret', 'this is the secret');

      let list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(['MySecret']);

      command = [
        'secrets',
        'rm',
        '-np',
        dataDir,
        '-sp',
        `${vaultName}:MySecret`,
      ];

      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);

      list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual([]);
    });
  });
  describe('commandGetSecret', () => {
    test('should retrieve secrets', async () => {
      const vaultName = 'Vault3';
      const vault = await polykeyAgent.vaults.createVault(vaultName);

      await vault.addSecret('MySecret', 'this is the secret');

      command = [
        'secrets',
        'get',
        '-np',
        dataDir,
        '-sp',
        `${vaultName}:MySecret`,
      ];

      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);
    });
  });
  describe('commandListSecrets', () => {
    test('should list secrets', async () => {
      const vaultName = 'Vault4';
      const vault = await polykeyAgent.vaults.createVault(vaultName);

      await vault.addSecret('MySecret1', 'this is the secret 1');
      await vault.addSecret('MySecret2', 'this is the secret 2');
      await vault.addSecret('MySecret3', 'this is the secret 3');

      command = ['secrets', 'ls', '-np', dataDir, '-vn', vaultName];

      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);
    });
  });
  describe('commandNewDir', () => {
    test('should make a directory', async () => {
      const vaultName = 'Vault5';
      const vault = await polykeyAgent.vaults.createVault(vaultName);

      command = [
        'secrets',
        'mkdir',
        '-np',
        dataDir,
        '-sp',
        `${vaultName}:dir1/dir2`,
      ];

      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);

      await vault.addSecret('dir1/MySecret1', 'this is the secret 1');
      await vault.addSecret('dir1/dir2/MySecret2', 'this is the secret 2');

      const list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(
        ['dir1/MySecret1', 'dir1/dir2/MySecret2'].sort(),
      );
    });
  });
  describe('commandRenameSecret', () => {
    test('should rename secrets', async () => {
      const vaultName = 'Vault6';
      const vault = await polykeyAgent.vaults.createVault(vaultName);

      await vault.addSecret('MySecret', 'this is the secret');

      command = [
        'secrets',
        'rename',
        '-np',
        dataDir,
        '-sp',
        `${vaultName}:MySecret`,
        '-sn',
        'MyRenamedSecret',
      ];

      const result = await utils.pkWithStdio([...command]);
      expect(result.code).toBe(0);

      const list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(['MyRenamedSecret']);
    });
  });
  describe('commandUpdateSecret', () => {
    test('should update secrets', async () => {
      const vaultName = 'Vault7';
      const vault = await polykeyAgent.vaults.createVault(vaultName);

      const secretPath = path.join(dataDir, 'secret');
      await fs.promises.writeFile(secretPath, 'updated-content');

      await vault.addSecret('MySecret', 'original-content');

      expect(await vault.getSecret('MySecret')).toStrictEqual(
        'original-content',
      );

      command = [
        'secrets',
        'update',
        '-np',
        dataDir,
        '-sp',
        `${vaultName}:MySecret`,
        '-fp',
        secretPath,
      ];

      const result2 = await utils.pkWithStdio([...command]);
      expect(result2.code).toBe(0);

      const list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(['MySecret']);
      expect(await vault.getSecret('MySecret')).toStrictEqual(
        'updated-content',
      );
    });
  });
  describe('commandNewDirSecret', () => {
    test('should add a directory of secrets', async () => {
      const vaultName = 'Vault8';
      const vault = await polykeyAgent.vaults.createVault(vaultName);

      const secretDir = path.join(dataDir, 'secrets');
      await fs.promises.mkdir(secretDir);
      await fs.promises.writeFile(
        path.join(secretDir, 'secret-1'),
        'this is the secret 1',
      );
      await fs.promises.writeFile(
        path.join(secretDir, 'secret-2'),
        'this is the secret 2',
      );
      await fs.promises.writeFile(
        path.join(secretDir, 'secret-3'),
        'this is the secret 3',
      );

      let list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual([]);

      command = [
        'secrets',
        'dir',
        '-np',
        dataDir,
        '-vn',
        vaultName,
        '-dp',
        secretDir,
      ];

      const result2 = await utils.pkWithStdio([...command]);
      expect(result2.code).toBe(0);

      list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual([
        'secrets/secret-1',
        'secrets/secret-2',
        'secrets/secret-3',
      ]);
    });
  });
});
