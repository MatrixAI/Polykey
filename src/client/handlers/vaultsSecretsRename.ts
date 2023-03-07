import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { SecretRenameMessage, SuccessMessage } from './types';
import type { DB } from '@matrixai/db';
import type VaultManager from '../../vaults/VaultManager';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const vaultsSecretsRename = new UnaryCaller<
  RPCRequestParams<SecretRenameMessage>,
  RPCResponseResult<SuccessMessage>
>();

class VaultsSecretsRenameHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  RPCRequestParams<SecretRenameMessage>,
  RPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: RPCRequestParams<SecretRenameMessage>,
  ): Promise<RPCResponseResult<SuccessMessage>> {
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
