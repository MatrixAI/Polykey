import type { VaultsScanMessage } from './types';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { DB } from '@matrixai/db';
import { ServerHandler } from '../../rpc/handlers';
import * as agentErrors from '../errors';
import * as vaultsUtils from '../../vaults/utils';

class VaultsScanHandler extends ServerHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  AgentRPCRequestParams,
  AgentRPCResponseResult<VaultsScanMessage>
> {
  public async *handle(
    input: AgentRPCRequestParams,
    _,
    meta,
  ): AsyncGenerator<AgentRPCResponseResult<VaultsScanMessage>> {
    const { vaultManager, db } = this.container;
    // Getting the NodeId from the ReverseProxy connection info
    const connectionInfo = meta;
    // If this is getting run the connection exists
    // It SHOULD exist here
    if (connectionInfo == null) {
      throw new agentErrors.ErrorConnectionInfoMissing();
    }
    const nodeId = connectionInfo.remoteNodeId;
    yield* db.withTransactionG(async function* (
      tran,
    ): AsyncGenerator<AgentRPCResponseResult<VaultsScanMessage>> {
      const listResponse = vaultManager.handleScanVaults(nodeId, tran);
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
  }
}

export { VaultsScanHandler };
