import type { VaultId } from '@/vaults/types';

import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { KeyManager } from '@/keys';
import { VaultManager, VaultMap } from '@/vaults';

describe('VaultMap is', () => {
  const logger = new Logger('VaultMap Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let vaultMap: VaultMap;
  let vaultMapPath: string;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    vaultMapPath = path.join(dataDir, 'vaultMap');
  });

  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('type correct', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
    });
    vaultMap = new VaultMap({
      vaultMapPath: vaultMapPath,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    expect(vaultMap).toBeInstanceOf(VaultMap);
  });

  test('starting and stopping', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
    });
    vaultMap = new VaultMap({
      vaultMapPath: vaultMapPath,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultMap.start();

    expect(vaultMap.started).toBeTruthy();

    await vaultMap.stop();
    await keyManager.stop();
  });

  test('putting a vault into storage', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
    });
    vaultMap = new VaultMap({
      vaultMapPath: vaultMapPath,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    await vaultMap.start();

    const vault1 = await vaultManager.createVault('MyFirstVault');
    await vaultMap.setVault(
      vault1.vaultName,
      vault1.vaultId as VaultId,
      Buffer.from('test'),
    );
    await expect(
      vaultMap.getVaultLinkByVaultId(vault1.vaultId as VaultId),
    ).resolves.toBe(undefined);
    await expect(vaultMap.getVaultIdByVaultName('MyFirstVault')).resolves.toBe(
      vault1.vaultId,
    );

    await vaultMap.setVaultLink(vault1.vaultId as VaultId, '1234567890');
    await expect(
      vaultMap.getVaultLinkByVaultId(vault1.vaultId as VaultId),
    ).resolves.toBe('1234567890');

    await vaultMap.stop();
    await keyManager.stop();
  });

  test('deleting a vault from storage', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
    });
    vaultMap = new VaultMap({
      vaultMapPath: vaultMapPath,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    await vaultMap.start();

    const vault1 = await vaultManager.createVault('MyFirstVault');
    await vaultMap.setVault(
      vault1.vaultName,
      vault1.vaultId as VaultId,
      Buffer.from('test'),
    );
    await vaultMap.setVaultLink(vault1.vaultId as VaultId, '1234567890');
    await vaultMap.delVault('MyFirstVault');
    await expect(
      vaultMap.getVaultLinkByVaultId(vault1.vaultId as VaultId),
    ).resolves.toBe(undefined);
    await expect(vaultMap.getVaultIdByVaultName('MyFirstVault')).resolves.toBe(
      undefined,
    );

    await vaultMap.stop();
    await keyManager.stop();
  });

  test('renaming a vault', async () => {
    const keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
    });
    vaultMap = new VaultMap({
      vaultMapPath: vaultMapPath,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    const vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    await vaultMap.start();

    const vault1 = await vaultManager.createVault('MyFirstVault');
    await vaultMap.setVault(
      vault1.vaultName,
      vault1.vaultId as VaultId,
      Buffer.from('test'),
    );
    await vaultMap.setVaultLink(vault1.vaultId as VaultId, '1234567890');
    await expect(
      vaultMap.getVaultLinkByVaultId(vault1.vaultId as VaultId),
    ).resolves.toBe('1234567890');
    await expect(vaultMap.getVaultIdByVaultName('MyFirstVault')).resolves.toBe(
      vault1.vaultId,
    );
    await vaultMap.renameVault('MyFirstVault', 'MyRenamedVault');
    await expect(vaultMap.getVaultIdByVaultName('MyFirstVault')).resolves.toBe(
      undefined,
    );
    await expect(
      vaultMap.getVaultIdByVaultName('MyRenamedVault'),
    ).resolves.toBe(vault1.vaultId as VaultId);

    await vaultMap.stop();
    await keyManager.stop();
  });
});
