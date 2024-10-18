import type { FileSystem } from 'types';
import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
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
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
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
        throw new vaultsErrors.ErrorVaultsVaultUndefined(
          `Vault "${input.nameOrId}" does not exist`,
        );
      }
      await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vaultOps.addSecretDirectory(
            vault,
            input.dirName,
            fs,
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

export default VaultsSecretsNewDir;
