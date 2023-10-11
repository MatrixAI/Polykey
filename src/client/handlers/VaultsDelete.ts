import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SuccessMessage,
  VaultIdentifierMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultName } from '../../vaults/types';
import { UnaryHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';

class VaultsDelete extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<VaultIdentifierMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<VaultIdentifierMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
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
  };
}

export default VaultsDelete;
