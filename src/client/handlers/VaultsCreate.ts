import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  VaultIdMessage,
  VaultNameMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';

class VaultsCreate extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<VaultNameMessage>,
  ClientRPCResponseResult<VaultIdMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<VaultNameMessage>,
  ): Promise<ClientRPCResponseResult<VaultIdMessage>> => {
    const { db, vaultManager } = this.container;

    const vaultId = await db.withTransactionF((tran) =>
      vaultManager.createVault(input.vaultName, tran),
    );

    return {
      vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
    };
  };
}

export default VaultsCreate;
