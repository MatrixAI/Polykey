import type { VaultsScanMessage } from './types';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { DB } from '@matrixai/db';
import * as agentErrors from '../errors';
import * as networkUtils from '../../network/utils';
import { ServerHandler } from '../../rpc/handlers';
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
    _cancel,
    meta,
  ): AsyncGenerator<AgentRPCResponseResult<VaultsScanMessage>> {
    const { vaultManager, db } = this.container;
    const requestingNodeId = networkUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }
    yield* db.withTransactionG(async function* (
      tran,
    ): AsyncGenerator<AgentRPCResponseResult<VaultsScanMessage>> {
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
  }
}

export { VaultsScanHandler };
