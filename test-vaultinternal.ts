import KeyManager from './src/keys/KeyManager';
import VaultInternal from './src/vaults/VaultInternal';
import * as vaultsUtils from './src/vaults/utils';
import { EncryptedFS, utils as efsUtils } from 'encryptedfs';

async function main () {
  const keyManager = await KeyManager.createKeyManager({
    keysPath: './tmp/keys',
    password: 'abc123'
  });

  // this buffer needs to e
  const [vaultKey] = await efsUtils.generateKeyFromPass('abc123', 'hello', 256);

  const efs = await EncryptedFS.createEncryptedFS({
    dbPath: './tmp/db',
    dbKey: vaultKey
  });

  const vaultId = vaultsUtils.generateVaultId();
  const vault = await VaultInternal.createVaultInternal({
    vaultId,
    keyManager,
    efs
  });

  await vault.stop();

  await efs.stop();
  await keyManager.stop();

}

main();
