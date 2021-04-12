import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import level from 'level';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { KeyManager } from '@/keys';
import { VaultManager } from '@/vaults';
import Vault from '@/vaults/Vault';
import * as errors from '@/vaults/errors';

describe('VaultManager is', () => {
  const logger = new Logger('VaultManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let keyManager: KeyManager;
  let vaultManager: VaultManager;

  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
    keyManager = new KeyManager({
      keysPath: `${dataDir}/keys`,
      fs: fs,
      logger: logger,
    });
    vaultManager = new VaultManager({
      baseDir: dataDir,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
  });

  afterEach(async () => {
    await fs.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('type correct', () => {
    expect(vaultManager).toBeInstanceOf(VaultManager);
  });
  test('starting and stopping', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});

      expect(await vaultManager.started()).toBe(true);
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('creating the directory', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});

      expect(await fs.stat(dataDir)).toBeTruthy();
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('able to create a vault', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const vault = await vaultManager.addVault('MyTestVault');
      expect(vault).toBeTruthy();
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('able to create and get a vault', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const newVault = await vaultManager.addVault('MyTestVault');
      const theVault = vaultManager.getVault('MyTestVault');

      expect(newVault).toBe(theVault);
      expect(() => vaultManager.getVault('DoesNotExist')).toThrow(
        errors.ErrorVaultUndefined,
      );
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('able to rename a vault', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const newVault = await vaultManager.addVault('MyTestVault');
      const result = await vaultManager.renameVault(
        'MyTestVault',
        'MyBetterTestVault',
      );

      expect(result).toBe(true);
      expect(vaultManager.getVault('MyBetterTestVault')).toBe(newVault);
      expect(() => vaultManager.getVault('DoesNotExist')).toThrow(
        errors.ErrorVaultUndefined,
      );
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('able to delete a vault', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const firstVault = await vaultManager.addVault('MyFirstVault');
      await vaultManager.addVault('MySecondVault');
      const thirdVault = await vaultManager.addVault('MyThirdVault');
      const result = await vaultManager.deleteVault('MySecondVault');

      expect(result).toBe(true);
      expect(vaultManager.getVault('MyFirstVault')).toBe(firstVault);
      expect(() => {
        vaultManager.getVault('MySecondVault');
      }).toThrow('MySecondVault does not exist');
      expect(vaultManager.getVault('MyThirdVault')).toBe(thirdVault);
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('able to list vaults', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      await vaultManager.addVault('MyTestVault');
      await vaultManager.addVault('MyOtherTestVault');

      expect(vaultManager.listVaults().sort()).toEqual(
        ['MyTestVault', 'MyOtherTestVault'].sort(),
      );
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('able to create many vaults', async () => {
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
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      for (const vaultName of vaultNames) {
        await vaultManager.addVault(vaultName);
      }

      expect(vaultManager.listVaults().sort()).toEqual(vaultNames.sort());
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('able to write metadata', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      await vaultManager.addVault('MyVault');
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
    const leveldb = await level(vaultManager.metadataPath);
    await leveldb.open();
    leveldb.createReadStream().on('data', (data) => {
      expect(data).toBeTruthy();
    });
    await leveldb.close();
  });
  test('able to read and load existing metadata', async () => {
    let vault: Vault;
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
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      for (const vaultName of vaultNames) {
        await vaultManager.addVault(vaultName);
      }
      vault = vaultManager.getVault('Vault1');
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
    const vaultManager2 = new VaultManager({
      baseDir: dataDir,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    try {
      await vaultManager2.start({});
      // implicit test of keys
      expect(vault.EncryptedFS.Stats).toEqual(
        vaultManager2.getVault('Vault1').EncryptedFS.Stats,
      );
      expect(vaultManager2.listVaults().sort()).toEqual(vaultNames.sort());
    } finally {
      await vaultManager2.stop();
    }
  });
  test('able to recover metadata after complex operations', async () => {
    let vault9: Vault;
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
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      for (const vaultName of vaultNames) {
        await vaultManager.addVault(vaultName);
      }
      await vaultManager.deleteVault('Vault10');
      await vaultManager.deleteVault('Vault5');
      vault9 = vaultManager.getVault('Vault9');
      await vaultManager.renameVault('Vault9', 'Vault10');
      await vaultManager.addVault('ThirdImpact');
      await vaultManager.addVault('Cake');
      await vault9.create();
      await vault9.initializeVault();
      await vault9.addSecret('MySecret', Buffer.from('MyActualPassword'));

      expect(vaultManager.listVaults().sort()).toEqual(
        alteredVaultNames.sort(),
      );
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
    const vaultManager2 = new VaultManager({
      baseDir: dataDir,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager2.start({});
      await vaultManager2.addVault('Pumpkin');

      // implicit test of keys
      expect(vault9.EncryptedFS.Stats).toEqual(
        vaultManager2.getVault('Vault10').EncryptedFS.Stats,
      );
      const secret = await vaultManager2
        .getVault('Vault10')
        .getSecret('MySecret');
      expect(secret.toString()).toBe('MyActualPassword');
      alteredVaultNames.push('Pumpkin');
      expect(vaultManager2.listVaults().sort()).toEqual(
        alteredVaultNames.sort(),
      );
    } finally {
      await vaultManager2.stop();
      await keyManager.stop();
    }
  });
});
