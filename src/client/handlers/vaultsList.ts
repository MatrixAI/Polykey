import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultListMessage } from './types';
import type { DB } from '@matrixai/db';
import * as vaultsUtils from '../../vaults/utils';
import { ServerCaller } from '../../RPC/callers';
import { ServerHandler } from '../../RPC/handlers';

const vaultsList = new ServerCaller<
  RPCRequestParams,
  RPCResponseResult<VaultListMessage>
>();

class VaultsListHandler extends ServerHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  RPCRequestParams,
  RPCResponseResult<VaultListMessage>
> {
  public async *handle(): AsyncGenerator<RPCResponseResult<VaultListMessage>> {
    const { db, vaultManager } = this.container;
    const vaults = await db.withTransactionF((tran) =>
      vaultManager.listVaults(tran),
    );
    for await (const [vaultName, vaultId] of vaults) {
      yield {
        vaultName,
        vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
      };
    }
  }
}

export { vaultsList, VaultsListHandler };
