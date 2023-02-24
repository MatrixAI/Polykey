import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { SuccessMessage, VaultIdentifierMessage } from './types';
import type { DB } from '@matrixai/db';
import type { VaultName } from '../../vaults/types';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const vaultsDelete = new UnaryCaller<
  RPCRequestParams<VaultIdentifierMessage>,
  RPCResponseResult<SuccessMessage>
>();

class VaultsDeleteHandler extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  RPCRequestParams<VaultIdentifierMessage>,
  RPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: RPCRequestParams<VaultIdentifierMessage>,
  ): Promise<RPCResponseResult<SuccessMessage>> {
    const { db, vaultManager } = this.container;
    await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId as VaultName,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      await vaultManager.destroyVault(vaultId, tran);
    });
    return {
      success: true,
    };
  }
}

export { vaultsDelete, VaultsDeleteHandler };
