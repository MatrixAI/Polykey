import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { SecretRenameMessage, SuccessMessage } from './types';
import type { DB } from '@matrixai/db';
import type VaultManager from '../../vaults/VaultManager';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryHandler } from '../../rpc/handlers';
import { UnaryCaller } from '../../rpc/callers';

const vaultsSecretsRename = new UnaryCaller<
  ClientRPCRequestParams<SecretRenameMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

class VaultsSecretsRenameHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<SecretRenameMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<SecretRenameMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> {
    const { vaultManager, db } = this.container;
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
    return {
      success: true,
    };
  }
}

export { vaultsSecretsRename, VaultsSecretsRenameHandler };
