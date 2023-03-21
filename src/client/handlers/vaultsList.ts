import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultListMessage } from './types';
import type { DB } from '@matrixai/db';
import * as vaultsUtils from '../../vaults/utils';
import { ServerCaller } from '../../rpc/callers';
import { ServerHandler } from '../../rpc/handlers';

const vaultsList = new ServerCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<VaultListMessage>
>();

class VaultsListHandler extends ServerHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<VaultListMessage>
> {
  public async *handle(): AsyncGenerator<
    ClientRPCResponseResult<VaultListMessage>
  > {
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
