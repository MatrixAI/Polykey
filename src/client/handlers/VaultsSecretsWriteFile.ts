import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretContentMessage,
  SuccessMessage,
} from '../types.js';
import type VaultManager from '../../vaults/VaultManager.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils.js';
import * as vaultsErrors from '../../vaults/errors.js';
import * as vaultOps from '../../vaults/VaultOps.js';

class VaultsSecretsWriteFile extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretContentMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<SecretContentMessage>,
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
      const secretContent = Buffer.from(input.secretContent, 'binary');
      await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vaultOps.writeSecret(
            vault,
            input.secretName,
            secretContent,
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

export default VaultsSecretsWriteFile;
