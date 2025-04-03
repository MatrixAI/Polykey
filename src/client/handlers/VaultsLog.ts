import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  LogEntryMessage,
  VaultsLogMessage,
} from '../types.js';
import type VaultManager from '../../vaults/VaultManager.js';
import { ServerHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils.js';
import * as vaultsErrors from '../../vaults/errors.js';

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
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<LogEntryMessage>> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    const log = await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined(
          `Vault "${input.nameOrId}" does not exist`,
        );
      }
      // Getting the log
      return await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          return await vault.log(input.commitId ?? 'HEAD', input.depth);
        },
        tran,
        ctx,
      );
    });
    for (const entry of log) {
      ctx.signal.throwIfAborted();
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
