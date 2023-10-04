import type { DB } from '@matrixai/db';
import type { VaultIdMessage, VaultNameMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import * as vaultsUtils from '../../vaults/utils';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';

class VaultsCreateHandler extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<VaultNameMessage>,
  ClientRPCResponseResult<VaultIdMessage>
> {
  public handle = async(
    input: ClientRPCRequestParams<VaultNameMessage>,
  ): Promise<ClientRPCResponseResult<VaultIdMessage>> => {
    const { db, vaultManager } = this.container;

    const vaultId = await db.withTransactionF((tran) =>
      vaultManager.createVault(input.vaultName, tran),
    );

    return {
      vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
    };
  }
}

export { VaultsCreateHandler };
