import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utils from './utils';

const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
let dataDir: string;
let polykeyAgent: PolykeyAgent;
let passwordFile: string;
let command: Array<string>;
const jwtTokenExitCode = 77;

describe('CLI secrets', () => {
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

  describe('commandCreateSecret', () => {
    test('should create secrets', async () => {
      const vault = await polykeyAgent.vaults.createVault('Vault1');

      const secretPath = path.join(dataDir, 'secret');
      await fs.promises.writeFile(secretPath, 'this is a secret');

      command = [
        'secrets',
        'create',
        '-np',
        dataDir,
        '-sp',
        'Vault1:MySecret',
        '-fp',
        secretPath,
      ];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);

      const list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(['MySecret']);
      expect(await vault.getSecret('MySecret')).toStrictEqual(
        'this is a secret',
      );
    });
  });
  describe('commandDeleteSecret', () => {
    test('should delete secrets', async () => {
      const vault = await polykeyAgent.vaults.createVault('Vault1');

      await vault.addSecret('MySecret', 'this is the secret');

      let list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(['MySecret']);

      command = ['secrets', 'rm', '-np', dataDir, '-sp', 'Vault1:MySecret'];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);

      list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual([]);
    });
  });
  describe('commandGetSecret', () => {
    test('should retreive secrets', async () => {
      const vault = await polykeyAgent.vaults.createVault('Vault1');

      await vault.addSecret('MySecret', 'this is the secret');

      command = ['secrets', 'get', '-np', dataDir, '-sp', 'Vault1:MySecret'];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);
    });
  });

  describe('commandListSecrets', () => {
    test('should list secrets', async () => {
      const vault = await polykeyAgent.vaults.createVault('Vault1');

      await vault.addSecret('MySecret1', 'this is the secret 1');
      await vault.addSecret('MySecret2', 'this is the secret 2');
      await vault.addSecret('MySecret3', 'this is the secret 3');

      command = ['secrets', 'ls', '-np', dataDir, '-vn', 'Vault1'];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);
    });
  });
  describe('commandNewDir', () => {
    test('should make a directory', async () => {
      const vault = await polykeyAgent.vaults.createVault('Vault1');

      command = ['secrets', 'mkdir', '-np', dataDir, '-sp', 'Vault1:dir1/dir2'];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);

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
      const vault = await polykeyAgent.vaults.createVault('Vault1');

      await vault.addSecret('MySecret', 'this is the secret');

      command = [
        'secrets',
        'rename',
        '-np',
        dataDir,
        '-sp',
        'Vault1:MySecret',
        '-sn',
        'MyRenamedSecret',
      ];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);

      const list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(['MyRenamedSecret']);
    });
  });

  describe('commandUpdateSecret', () => {
    test('should update secrets', async () => {
      const vault = await polykeyAgent.vaults.createVault('Vault1');

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
        'Vault1:MySecret',
        '-fp',
        secretPath,
      ];

      const result2 = await utils.pk([...command]);
      expect(result2).toBe(0);

      const list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(['MySecret']);
      expect(await vault.getSecret('MySecret')).toStrictEqual(
        'updated-content',
      );
    });
  });

  describe('commandNewDirSecret', () => {
    test('should add a directory of secrets', async () => {
      const vault = await polykeyAgent.vaults.createVault('Vault1');

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
        'Vault1',
        '-dp',
        secretDir,
      ];

      const result2 = await utils.pk([...command]);
      expect(result2).toBe(0);

      list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual([
        'secrets/secret-1',
        'secrets/secret-2',
        'secrets/secret-3',
      ]);
    });
  });
});
