import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultListMessage } from './types';
import type { DB } from '@matrixai/db';
import * as vaultsUtils from '../../vaults/utils';
import { ServerHandler } from '../../rpc/handlers';

class VaultsListHandler extends ServerHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<VaultListMessage>
> {
  public async *handle(
    _input,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<VaultListMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const { db, vaultManager } = this.container;
    const vaults = await db.withTransactionF((tran) =>
      vaultManager.listVaults(tran),
    );
    for await (const [vaultName, vaultId] of vaults) {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      yield {
        vaultName,
        vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
      };
    }
  }
}

export { VaultsListHandler };
