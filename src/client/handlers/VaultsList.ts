import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  VaultListMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { JSONValue } from '@matrixai/rpc';
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
    _input: ClientRPCRequestParams,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<VaultListMessage>> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    const vaults = await db.withTransactionF((tran) =>
      vaultManager.listVaults(ctx, tran),
    );
    for await (const [vaultName, vaultId] of vaults) {
      ctx.signal.throwIfAborted();
      yield {
        vaultName: vaultName,
        vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
      };
    }
  };
}

export default VaultsList;
