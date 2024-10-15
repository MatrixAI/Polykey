import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  LogEntryMessage,
  VaultsLogMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultName } from '../../vaults/types';
import { ServerHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';

class VaultsLog extends ServerHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<VaultsLogMessage>,
  ClientRPCResponseResult<LogEntryMessage>
> {
  public handle = async function* (
    input: ClientRPCRequestParams<VaultsLogMessage>,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<LogEntryMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    const log = await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId as VaultName,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      // Getting the log
      return await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          return await vault.log(input.commitId, input.depth);
        },
        tran,
      );
    });
    for (const entry of log) {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      yield {
        commitId: entry.commitId,
        committer: entry.committer.name,
        timestamp: entry.committer.timestamp.toString(),
        message: entry.message,
      };
    }
  };
}

export default VaultsLog;
