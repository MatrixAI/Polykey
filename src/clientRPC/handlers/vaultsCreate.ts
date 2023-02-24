import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { DB } from '@matrixai/db';
import type { VaultIdMessage, VaultNameMessage } from './types';
import * as vaultsUtils from '../../vaults/utils';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const vaultsCreate = new UnaryCaller<
  RPCRequestParams<VaultNameMessage>,
  RPCResponseResult<VaultIdMessage>
>();

class VaultsCreatehandler extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  RPCRequestParams<VaultNameMessage>,
  RPCResponseResult<VaultIdMessage>
> {
  public async handle(
    input: RPCRequestParams<VaultNameMessage>,
  ): Promise<RPCResponseResult<VaultIdMessage>> {
    const { db, vaultManager } = this.container;

    const vaultId = await db.withTransactionF((tran) =>
      vaultManager.createVault(input.vaultName, tran),
    );

    return {
      vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
    };
  }
}

export { vaultsCreate, VaultsCreatehandler };
