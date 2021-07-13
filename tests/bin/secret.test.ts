import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utils from './utils';

const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
let dataDir: string;
let polykeyAgent: PolykeyAgent;
let duration: number;
let passwordFile: string;
const jwtTokenExitCode = 77;

describe('CLI secrets', () => {
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    duration = 500;
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
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), duration);
    });
    await polykeyAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('should create secrets', async () => {
    const vault = await polykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();

    const secretPath = path.join(dataDir, 'secret');
    await fs.promises.writeFile(secretPath, 'this is a secret');

    const result = await utils.pk([
      'secrets',
      'create',
      '-np',
      dataDir,
      '-sp',
      'Vault1:MySecret',
      '-fp',
      secretPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);

    const list = await vault.listSecrets();
    expect(list.sort()).toStrictEqual(['MySecret']);
    expect(await vault.getSecret('MySecret')).toStrictEqual(
      Buffer.from('this is a secret'),
    );
  });
  test('should delete secrets', async () => {
    const vault = await polykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();

    await vault.addSecret('MySecret', Buffer.from('this is the secret'));

    let list = await vault.listSecrets();
    expect(list.sort()).toStrictEqual(['MySecret']);

    const result2 = await utils.pk([
      'secrets',
      'rm',
      '-np',
      dataDir,
      '-sp',
      'Vault1:MySecret',
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(0);

    list = await vault.listSecrets();
    expect(list.sort()).toStrictEqual([]);
  });
  test('should retreive secrets', async () => {
    const vault = await polykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();

    await vault.addSecret('MySecret', Buffer.from('this is the secret'));

    const result = await utils.pk([
      'secrets',
      'get',
      '-np',
      dataDir,
      '-sp',
      'Vault1:MySecret',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
  });
  test('should list secrets', async () => {
    const vault = await polykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();

    await vault.addSecret('MySecret1', Buffer.from('this is the secret 1'));
    await vault.addSecret('MySecret2', Buffer.from('this is the secret 2'));
    await vault.addSecret('MySecret3', Buffer.from('this is the secret 3'));

    const result = await utils.pk([
      'secrets',
      'ls',
      '-np',
      dataDir,
      '-vn',
      'Vault1',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
  });
  test('should make a directory', async () => {
    const vault = await polykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();

    const result = await utils.pk([
      'secrets',
      'mkdir',
      '-np',
      dataDir,
      '-sp',
      'Vault1:dir1/dir2',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);

    await vault.addSecret(
      'dir1/MySecret1',
      Buffer.from('this is the secret 1'),
    );
    await vault.addSecret(
      'dir1/dir2/MySecret2',
      Buffer.from('this is the secret 2'),
    );

    const list = await vault.listSecrets();
    expect(list.sort()).toStrictEqual(
      ['dir1/MySecret1', 'dir1/dir2/MySecret2'].sort(),
    );
  });
  test('should rename secrets', async () => {
    const vault = await polykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();

    await vault.addSecret('MySecret', Buffer.from('this is the secret'));

    const result = await utils.pk([
      'secrets',
      'rename',
      '-np',
      dataDir,
      '-sp',
      'Vault1:MySecret',
      '-sn',
      'MyRenamedSecret',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);

    const list = await vault.listSecrets();
    expect(list.sort()).toStrictEqual(['MyRenamedSecret']);
  });
  test('should update secrets', async () => {
    const vault = await polykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();

    const secretPath = path.join(dataDir, 'secret');
    await fs.promises.writeFile(secretPath, 'updated-content');

    await vault.addSecret('MySecret', Buffer.from('original-content'));

    expect(await vault.getSecret('MySecret')).toStrictEqual(
      Buffer.from('original-content'),
    );

    const result2 = await utils.pk([
      'secrets',
      'update',
      '-np',
      dataDir,
      '-sp',
      'Vault1:MySecret',
      '-fp',
      secretPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(0);

    const list = await vault.listSecrets();
    expect(list.sort()).toStrictEqual(['MySecret']);
    expect(await vault.getSecret('MySecret')).toStrictEqual(
      Buffer.from('updated-content'),
    );
  });
  test('should add a directory of secrets', async () => {
    const vault = await polykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();

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

    const result2 = await utils.pk([
      'secrets',
      'dir',
      '-np',
      dataDir,
      '-vn',
      'Vault1',
      '-dp',
      secretDir,
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(0);

    list = await vault.listSecrets();
    expect(list.sort()).toStrictEqual([
      'secrets/secret-1',
      'secrets/secret-2',
      'secrets/secret-3',
    ]);
  });
});

describe('CLI secrets', () => {
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    duration = 500;
    polykeyAgent = new PolykeyAgent({
      nodePath: dataDir,
      logger: logger,
    });
    await polykeyAgent.start({
      password: 'password',
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), duration);
    });
    await polykeyAgent.stop();
    await fs.promises.rmdir(dataDir, { recursive: true });
  });

  test('should not create secrets without token', async () => {
    const vault = await polykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();

    const secretPath = path.join(dataDir, 'secret');
    await fs.promises.writeFile(secretPath, 'this is a secret');

    const result = await utils.pk([
      'secrets',
      'create',
      '-np',
      dataDir,
      '-sp',
      'Vault1:MySecret',
      '-fp',
      secretPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
  test('should not delete secrets without token', async () => {
    const result2 = await utils.pk([
      'secrets',
      'rm',
      '-np',
      dataDir,
      '-sp',
      'Vault1:MySecret',
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(jwtTokenExitCode);
  });
  test('should not retreive secrets without token', async () => {
    const result = await utils.pk([
      'secrets',
      'get',
      '-np',
      dataDir,
      '-sp',
      'Vault1:MySecret',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
  test('should not list secrets without token', async () => {
    const result = await utils.pk([
      'secrets',
      'ls',
      '-np',
      dataDir,
      '-vn',
      'Vault1',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
  test('should not make a directory without token', async () => {
    const result = await utils.pk([
      'secrets',
      'mkdir',
      '-np',
      dataDir,
      '-sp',
      'Vault1:dir1/dir2',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
  test('should not rename secrets without token', async () => {
    const result = await utils.pk([
      'secrets',
      'rename',
      '-np',
      dataDir,
      '-sp',
      'Vault1:MySecret',
      '-sn',
      'MyRenamedSecret',
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
  test('should not update secrets without token', async () => {
    const vault = await polykeyAgent.vaults.createVault('Vault1');
    await vault.initializeVault();

    const secretPath = path.join(dataDir, 'secret');
    await fs.promises.writeFile(secretPath, 'updated-content');

    const result2 = await utils.pk([
      'secrets',
      'update',
      '-np',
      dataDir,
      '-sp',
      'Vault1:MySecret',
      '-fp',
      secretPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(jwtTokenExitCode);
  });
  test('should not add a directory of secrets without token', async () => {
    const secretDir = path.join(dataDir, 'secrets');
    const result2 = await utils.pk([
      'secrets',
      'dir',
      '-np',
      dataDir,
      '-vn',
      'Vault1',
      '-dp',
      secretDir,
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(jwtTokenExitCode);
  });
});
