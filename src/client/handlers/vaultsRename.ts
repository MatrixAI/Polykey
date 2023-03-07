import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { VaultIdMessage, VaultsRenameMessage } from './types';
import type { DB } from '@matrixai/db';
import type VaultManager from '../../vaults/VaultManager';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const vaultsRename = new UnaryCaller<
  RPCRequestParams<VaultsRenameMessage>,
  RPCResponseResult<VaultIdMessage>
>();

class VaultsRenameHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  RPCRequestParams<VaultsRenameMessage>,
  RPCResponseResult<VaultIdMessage>
> {
  public async handle(
    input: RPCRequestParams<VaultsRenameMessage>,
  ): Promise<RPCResponseResult<VaultIdMessage>> {
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
  }
}

export { vaultsRename, VaultsRenameHandler };
