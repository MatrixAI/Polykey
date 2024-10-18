import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
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
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
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
        throw new vaultsErrors.ErrorVaultsVaultUndefined(
          `Vault "${input.nameOrId}" does not exist`,
        );
      }
      await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vaultOps.renameSecret(
            vault,
            input.secretName,
            input.newSecretName,
            undefined,
            ctx,
          );
        },
        tran,
        ctx,
      );
    });
    return { success: true };
  };
}

export default VaultsSecretsRename;
