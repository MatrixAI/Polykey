import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretRenameMessage,
  SuccessMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';

class VaultsSecretsRename extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretRenameMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<SecretRenameMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
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
          await vaultOps.renameSecret(
            vault,
            input.secretName,
            input.newSecretName,
          );
        },
        tran,
      );
    });
    return { type: 'success', success: true };
  };
}

export default VaultsSecretsRename;
