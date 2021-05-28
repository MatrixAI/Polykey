import os from 'os';
import path from 'path';
import fs from 'fs';
import level from 'level';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { KeyManager } from '@/keys';
import { VaultManager } from '@/vaults';
import * as errors from '@/vaults/errors';

describe('VaultManager is', () => {
  const logger = new Logger('VaultManager Test', LogLevel.WARN, [
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

  test('type correct', () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    expect(vaultManager).toBeInstanceOf(VaultManager);
  });
  test('starting and stopping', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});

    expect(await vaultManager.started()).toBe(true);
    await vaultManager.stop();
    await keyManager.stop();
  });
  test('creating the directory', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});

    expect(await fs.promises.stat(dataDir)).toBeTruthy();
    await vaultManager.stop();
    await keyManager.stop();
  });
  test('able to create a vault', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    const vault = await vaultManager.createVault('MyTestVault');
    expect(vault).toBeTruthy();
    await vaultManager.stop();
    await keyManager.stop();
  });
  test('able to create and get a vault', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    const newVault = await vaultManager.createVault('MyTestVault');
    const theVault = vaultManager.getVault(newVault.vaultId);

    expect(newVault).toBe(theVault);
    expect(() => vaultManager.getVault('DoesNotExist')).toThrow(
      errors.ErrorVaultUndefined,
    );

    await vaultManager.stop();
    await keyManager.stop();
  });
  test('able to rename a vault', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    const newVault = await vaultManager.createVault('MyTestVault');
    const result = await vaultManager.renameVault(
      newVault.vaultId,
      'MyBetterTestVault',
    );

    expect(result).toBe(true);
    expect(vaultManager.getVault(newVault.vaultId)).toBe(newVault);
    expect(() => vaultManager.getVault('DoesNotExist')).toThrow(
      errors.ErrorVaultUndefined,
    );

    await vaultManager.stop();
    await keyManager.stop();
  });
  test('able to delete a vault', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    const firstVault = await vaultManager.createVault('MyFirstVault');
    const secondVault = await vaultManager.createVault('MySecondVault');
    const thirdVault = await vaultManager.createVault('MyThirdVault');
    const result = await vaultManager.deleteVault(secondVault.vaultId);

    expect(result).toBe(true);
    expect(vaultManager.getVault(firstVault.vaultId)).toBe(firstVault);
    expect(() => {
      vaultManager.getVault(secondVault.vaultId);
    }).toThrow(`${secondVault.vaultId} does not exist`);
    expect(vaultManager.getVault(thirdVault.vaultId)).toBe(thirdVault);

    await vaultManager.stop();
    await keyManager.stop();
  });
  test('able to list vaults', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    await vaultManager.createVault('MyTestVault');
    await vaultManager.createVault('MyOtherTestVault');

    const vn: Array<string> = [];
    vaultManager.listVaults().forEach((a) => vn.push(a.name));
    expect(vn.sort()).toEqual(['MyTestVault', 'MyOtherTestVault'].sort());

    await vaultManager.stop();
  });
  test('able to get vault stats', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    const vault1 = await vaultManager.createVault('MyTestVault');
    const vault2 = await vaultManager.createVault('MyOtherTestVault');

    const stat1 = await vaultManager.vaultStats(vault1.vaultId);
    const stat2 = await vaultManager.vaultStats(vault2.vaultId);

    expect(stat1.ctime < stat2.ctime).toBeTruthy();
    await vaultManager.stop();
  });
  test('able to create many vaults', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    const vaultNames = [
      'Vault1',
      'Vault2',
      'Vault3',
      'Vault4',
      'Vault5',
      'Vault6',
      'Vault7',
      'Vault8',
      'Vault9',
      'Vault10',
      'Vault11',
      'Vault12',
      'Vault13',
      'Vault14',
      'Vault15',
      'Vault16',
      'Vault17',
      'Vault18',
      'Vault19',
      'Vault20',
    ];

    await vaultManager.start({});
    for (const vaultName of vaultNames) {
      await vaultManager.createVault(vaultName);
    }

    expect(vaultManager.listVaults().length).toEqual(vaultNames.length);

    await vaultManager.stop();
    await keyManager.stop();
  });
  test('able to write metadata', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    await vaultManager.createVault('MyVault');

    await vaultManager.stop();
    await keyManager.stop();

    const leveldb = await level(vaultManager.metadataPath);
    await leveldb.open();
    leveldb.createReadStream().on('data', (data) => {
      expect(data).toBeTruthy();
    });
    await leveldb.close();
  });
  test('able to read and load existing metadata', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    const vaultNames = [
      'Vault1',
      'Vault2',
      'Vault3',
      'Vault4',
      'Vault5',
      'Vault6',
      'Vault7',
      'Vault8',
      'Vault9',
      'Vault10',
    ];

    await vaultManager.start({});
    for (const vaultName of vaultNames) {
      await vaultManager.createVault(vaultName);
    }
    const vaults = vaultManager.listVaults();
    let vaultId: string = '';
    for (const v of vaults) {
      if (v.name === 'Vault1') {
        vaultId = v.id;
        break;
      }
    }
    expect(vaultId).not.toBe('');

    const vault = vaultManager.getVault(vaultId);
    expect(vault).toBeTruthy();
    // vault = vaultManager.getVault('Vault1');

    await vaultManager.stop();

    const vaultManager2 = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });

    await vaultManager2.start({});
    const vaults2 = vaultManager2.listVaults();
    let vaultId2: string = '';
    for (const v of vaults2) {
      if (v.name === 'Vault1') {
        vaultId2 = v.id;
        break;
      }
    }
    // implicit test of keys
    expect(vault.EncryptedFS.Stats).toEqual(
      vaultManager2.getVault(vaultId2).EncryptedFS.Stats,
    );
    const vn: Array<string> = [];
    vaultManager2.listVaults().forEach((a) => vn.push(a.name));
    expect(vn.sort()).toEqual(vaultNames.sort());

    await vaultManager2.stop();
    await keyManager.stop();
  });
  test('able to recover metadata after complex operations', async () => {
    const vaultNames = [
      'Vault1',
      'Vault2',
      'Vault3',
      'Vault4',
      'Vault5',
      'Vault6',
      'Vault7',
      'Vault8',
      'Vault9',
      'Vault10',
    ];
    const alteredVaultNames = [
      'Vault1',
      'Vault2',
      'Vault3',
      'Vault4',
      'Vault6',
      'Vault7',
      'Vault8',
      'Vault10',
      'ThirdImpact',
      'Cake',
    ];
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    for (const vaultName of vaultNames) {
      await vaultManager.createVault(vaultName);
    }
    const v10 = vaultManager.getVaultIds('Vault10').pop();
    expect(v10).toBeTruthy();
    await vaultManager.deleteVault(v10!);
    const v5 = vaultManager.getVaultIds('Vault5').pop();
    expect(v5).toBeTruthy();
    await vaultManager.deleteVault(v5!);
    const v9 = vaultManager.getVaultIds('Vault9').pop();
    expect(v9).toBeTruthy();
    const vault9 = vaultManager.getVault(v9!);
    await vaultManager.renameVault(v9!, 'Vault10');
    await vaultManager.createVault('ThirdImpact');
    await vaultManager.createVault('Cake');
    await vault9.create();
    await vault9.initializeVault();
    await vault9.addSecret('MySecret', Buffer.from('MyActualPassword'));

    const vn: Array<string> = [];
    vaultManager.listVaults().forEach((a) => vn.push(a.name));
    expect(vn.sort()).toEqual(alteredVaultNames.sort());

    await vaultManager.stop();

    const vaultManager2 = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });

    await vaultManager2.start({});
    await vaultManager2.createVault('Pumpkin');

    // implicit test of keys
    const v102 = vaultManager2.getVaultIds('Vault10').pop();
    expect(v102).toBeTruthy();
    expect(vault9.EncryptedFS.Stats).toEqual(
      vaultManager2.getVault(v102!).EncryptedFS.Stats,
    );
    const secret = await vaultManager2.getVault(v102!).getSecret('MySecret');
    expect(secret.toString()).toBe('MyActualPassword');
    alteredVaultNames.push('Pumpkin');
    expect(vaultManager2.listVaults().length).toEqual(alteredVaultNames.length);

    await vaultManager2.stop();
    await keyManager.stop();
  });
});
