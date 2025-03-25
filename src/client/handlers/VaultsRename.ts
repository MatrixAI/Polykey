import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  VaultIdMessage,
  VaultsRenameMessage,
} from '../types.js';
import type VaultManager from '../../vaults/VaultManager.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils.js';
import * as vaultsErrors from '../../vaults/errors.js';

class VaultsRename extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<VaultsRenameMessage>,
  ClientRPCResponseResult<VaultIdMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<VaultsRenameMessage>,
  ): Promise<ClientRPCResponseResult<VaultIdMessage>> => {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    return await db.withTransactionF(async (tran) => {
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
      await vaultManager.renameVault(vaultId, input.newName, tran);
      return { vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId) };
    });
  };
}

export default VaultsRename;
