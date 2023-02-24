import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { DB } from '@matrixai/db';
import type { LogEntryMessage, VaultsLogMessage } from './types';
import type { VaultName } from '../../vaults/types';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { ServerCaller } from '../../RPC/callers';
import { ServerHandler } from '../../RPC/handlers';

const vaultsLog = new ServerCaller<
  RPCRequestParams<VaultsLogMessage>,
  RPCResponseResult<LogEntryMessage>
>();

class VaultsLogHandler extends ServerHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  RPCRequestParams<VaultsLogMessage>,
  RPCResponseResult<LogEntryMessage>
> {
  public async *handle(
    input: RPCRequestParams<VaultsLogMessage>,
  ): AsyncGenerator<RPCResponseResult<LogEntryMessage>> {
    const { db, vaultManager } = this.container;
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
      yield {
        commitId: entry.commitId,
        committer: entry.committer.name,
        timestamp: entry.committer.timestamp.toString(),
        message: entry.message,
      };
    }
  }
}

export { vaultsLog, VaultsLogHandler };
