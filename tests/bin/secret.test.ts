import type { VaultName } from '@/vaults/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import { vaultOps } from '@/vaults';
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
  const password = 'password';
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
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: dataDir,
      logger: logger,
    });
    // Authorize session
    await utils.pkStdio(
      ['agent', 'unlock', '-np', dataDir, '--password-file', passwordFile],
      {},
      dataDir,
    );
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  describe('commandCreateSecret', () => {
    test('should create secrets', async () => {
      const vaultName = 'Vault1' as VaultName;
      const vault = await polykeyAgent.vaultManager.createVault(vaultName);
      const secretPath = path.join(dataDir, 'secret');
      await fs.promises.writeFile(secretPath, 'this is a secret');

      command = [
        'secrets',
        'create',
        '-np',
        dataDir,
        secretPath,
        `${vaultName}:MySecret`,
      ];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      const list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual(['MySecret']);
      expect(
        (await vaultOps.getSecret(vault, 'MySecret')).toString(),
      ).toStrictEqual('this is a secret');
    });
  });
  describe('commandDeleteSecret', () => {
    test('should delete secrets', async () => {
      const vaultName = 'Vault2' as VaultName;
      const vault = await polykeyAgent.vaultManager.createVault(vaultName);

      await vaultOps.addSecret(vault, 'MySecret', 'this is the secret');

      let list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual(['MySecret']);

      command = ['secrets', 'delete', '-np', dataDir, `${vaultName}:MySecret`];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual([]);
    });
  });
  describe('commandGetSecret', () => {
    test('should retrieve secrets', async () => {
      const vaultName = 'Vault3' as VaultName;
      const vault = await polykeyAgent.vaultManager.createVault(vaultName);

      await vaultOps.addSecret(vault, 'MySecret', 'this is the secret');

      command = ['secrets', 'get', '-np', dataDir, `${vaultName}:MySecret`];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
    });
  });
  describe('commandListSecrets', () => {
    test('should list secrets', async () => {
      const vaultName = 'Vault4' as VaultName;
      const vault = await polykeyAgent.vaultManager.createVault(vaultName);

      await vaultOps.addSecret(vault, 'MySecret1', 'this is the secret 1');
      await vaultOps.addSecret(vault, 'MySecret2', 'this is the secret 2');
      await vaultOps.addSecret(vault, 'MySecret3', 'this is the secret 3');

      command = ['secrets', 'list', '-np', dataDir, vaultName];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
    });
  });
  describe('commandNewDir', () => {
    test('should make a directory', async () => {
      const vaultName = 'Vault5' as VaultName;
      const vault = await polykeyAgent.vaultManager.createVault(vaultName);

      command = [
        'secrets',
        'mkdir',
        '-np',
        dataDir,
        `${vaultName}:dir1/dir2`,
        '-r',
      ];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      await vaultOps.addSecret(vault, 'dir1/MySecret1', 'this is the secret 1');
      await vaultOps.addSecret(
        vault,
        'dir1/dir2/MySecret2',
        'this is the secret 2',
      );

      const list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual(
        ['dir1/MySecret1', 'dir1/dir2/MySecret2'].sort(),
      );
    });
  });
  describe('commandRenameSecret', () => {
    test('should rename secrets', async () => {
      const vaultName = 'Vault6' as VaultName;
      const vault = await polykeyAgent.vaultManager.createVault(vaultName);

      await vaultOps.addSecret(vault, 'MySecret', 'this is the secret');

      command = [
        'secrets',
        'rename',
        '-np',
        dataDir,
        `${vaultName}:MySecret`,
        'MyRenamedSecret',
      ];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      const list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual(['MyRenamedSecret']);
    });
  });
  describe('commandUpdateSecret', () => {
    test('should update secrets', async () => {
      const vaultName = 'Vault7' as VaultName;
      const vault = await polykeyAgent.vaultManager.createVault(vaultName);

      const secretPath = path.join(dataDir, 'secret');
      await fs.promises.writeFile(secretPath, 'updated-content');

      await vaultOps.addSecret(vault, 'MySecret', 'original-content');

      expect(
        (await vaultOps.getSecret(vault, 'MySecret')).toString(),
      ).toStrictEqual('original-content');

      command = [
        'secrets',
        'update',
        '-np',
        dataDir,
        secretPath,
        `${vaultName}:MySecret`,
      ];

      const result2 = await utils.pkStdio([...command], {}, dataDir);
      expect(result2.exitCode).toBe(0);

      const list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual(['MySecret']);
      expect(
        (await vaultOps.getSecret(vault, 'MySecret')).toString(),
      ).toStrictEqual('updated-content');
    });
  });
  describe('commandNewDirSecret', () => {
    test('should add a directory of secrets', async () => {
      const vaultName = 'Vault8' as VaultName;
      const vault = await polykeyAgent.vaultManager.createVault(vaultName);

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

      let list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual([]);

      command = ['secrets', 'dir', '-np', dataDir, secretDir, vaultName];

      const result2 = await utils.pkStdio([...command], {}, dataDir);
      expect(result2.exitCode).toBe(0);

      list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual([
        'secrets/secret-1',
        'secrets/secret-2',
        'secrets/secret-3',
      ]);
    });
  });
});
