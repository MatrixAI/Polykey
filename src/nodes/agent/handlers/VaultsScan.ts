import type { DB } from '@matrixai/db';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  VaultsScanMessage,
} from '../types';
import type VaultManager from '../../../vaults/VaultManager';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';
import * as vaultsUtils from '../../../vaults/utils';
import { ServerHandler } from '@matrixai/rpc/dist/handlers';

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
    input: AgentRPCRequestParams,
    _cancel,
    meta,
  ): AsyncGenerator<AgentRPCResponseResult<VaultsScanMessage>> {
    const { vaultManager, db } = this.container;
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
      );
      for await (const {
        vaultId,
        vaultName,
        vaultPermissions,
      } of listResponse) {
        yield {
          vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
          vaultName,
          vaultPermissions,
        };
      }
    });
  };
}

export default VaultsScan;
