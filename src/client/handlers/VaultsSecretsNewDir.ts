import type { FileSystem } from 'types';
import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretDirMessage,
  SuccessMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';

class VaultsSecretsNewDir extends UnaryHandler<
  {
    db: DB;
    fs: FileSystem;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretDirMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<SecretDirMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const {
      db,
      fs,
      vaultManager,
    }: { db: DB; fs: FileSystem; vaultManager: VaultManager } = this.container;
    await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vaultOps.addSecretDirectory(vault, input.dirName, fs);
        },
        tran,
      );
    });
    return { type: 'success', success: true };
  };
}

export default VaultsSecretsNewDir;
