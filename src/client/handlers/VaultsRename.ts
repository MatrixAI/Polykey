import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  VaultIdMessage,
  VaultsRenameMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';

class VaultsRename extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<VaultsRenameMessage>,
  ClientRPCResponseResult<VaultIdMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<VaultsRenameMessage>,
  ): Promise<ClientRPCResponseResult<VaultIdMessage>> => {
    const { db, vaultManager } = this.container;
    return await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      await vaultManager.renameVault(vaultId, input.newName, tran);
      return {
        vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
      };
    });
  };
}

export default VaultsRename;
