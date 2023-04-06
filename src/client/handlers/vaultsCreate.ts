import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { DB } from '@matrixai/db';
import type { VaultIdMessage, VaultNameMessage } from './types';
import * as vaultsUtils from '../../vaults/utils';
import { UnaryHandler } from '../../rpc/handlers';

class VaultsCreateHandler extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<VaultNameMessage>,
  ClientRPCResponseResult<VaultIdMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<VaultNameMessage>,
  ): Promise<ClientRPCResponseResult<VaultIdMessage>> {
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
