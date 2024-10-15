import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  VaultListMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { ServerHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';

class VaultsList extends ServerHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<VaultListMessage>
> {
  public handle = async function* (
    _input,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<VaultListMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
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
  };
}

export default VaultsList;
