import type { VaultName } from '@/vaults/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { vaultOps } from '@/vaults';
import * as keysUtils from '@/keys/utils';
import * as testBinUtils from '../utils';

describe('CLI secrets', () => {
  const password = 'password';
  const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
  let dataDir: string;
  let polykeyAgent: PolykeyAgent;
  let passwordFile: string;
  let command: Array<string>;

  const mockedGenerateDeterministicKeyPair = jest.spyOn(
    keysUtils,
    'generateDeterministicKeyPair',
  );

  beforeAll(async () => {
    mockedGenerateDeterministicKeyPair.mockImplementation((bits, _) => {
      return keysUtils.generateKeyPair(bits);
    });
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
    await testBinUtils.pkStdio(
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
    test(
      'should create secrets',
      async () => {
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

        const result = await testBinUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(0);

        const list = await vaultOps.listSecrets(vault);
        expect(list.sort()).toStrictEqual(['MySecret']);
        expect(
          (await vaultOps.getSecret(vault, 'MySecret')).toString(),
        ).toStrictEqual('this is a secret');
      },
      global.defaultTimeout * 2,
    );
  });
  describe('commandDeleteSecret', () => {
    test('should delete secrets', async () => {
      const vaultName = 'Vault2' as VaultName;
      const vault = await polykeyAgent.vaultManager.createVault(vaultName);

      await vaultOps.addSecret(vault, 'MySecret', 'this is the secret');

      let list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual(['MySecret']);

      command = ['secrets', 'delete', '-np', dataDir, `${vaultName}:MySecret`];

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
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

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
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

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
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

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
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

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
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

      const result2 = await testBinUtils.pkStdio([...command], {}, dataDir);
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

      const result2 = await testBinUtils.pkStdio([...command], {}, dataDir);
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
