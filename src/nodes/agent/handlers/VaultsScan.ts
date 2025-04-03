import type { DB } from '@matrixai/db';
import type { ContextTimed } from '@matrixai/contexts';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  VaultsScanMessage,
} from '../types.js';
import type VaultManager from '../../../vaults/VaultManager.js';
import type { JSONValue } from '@matrixai/rpc';
import { ServerHandler } from '@matrixai/rpc';
import * as agentErrors from '../errors.js';
import * as agentUtils from '../utils.js';
import * as vaultsUtils from '../../../vaults/utils.js';

/**
 * Scan vaults.
 */
class VaultsScan extends ServerHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  AgentRPCRequestParams,
  AgentRPCResponseResult<VaultsScanMessage>
> {
  public handle = async function* (
    _input: AgentRPCRequestParams,
    _cancel: (reason?: any) => void,
    meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<AgentRPCResponseResult<VaultsScanMessage>> {
    const { vaultManager, db }: { vaultManager: VaultManager; db: DB } =
      this.container;
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }
    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      AgentRPCResponseResult<VaultsScanMessage>
    > {
      const listResponse = vaultManager.handleScanVaults(
        requestingNodeId,
        tran,
        ctx,
      );
      for await (const {
        vaultId,
        vaultName,
        vaultPermissions,
      } of listResponse) {
        ctx.signal.throwIfAborted();
        yield {
          vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
          vaultName: vaultName,
          vaultPermissions: vaultPermissions,
        };
      }
    });
  };
}

export default VaultsScan;
