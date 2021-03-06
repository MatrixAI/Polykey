import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type VaultManager from '../../vaults/VaultManager';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type { ConnectionInfoGet } from '../../agent/types';
import type Logger from '@matrixai/logger';
import * as agentErrors from '../../agent/errors';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as vaultsUtils from '../../vaults/utils';
import * as grpcUtils from '../../grpc/utils';
import * as agentUtils from '../utils';

function vaultsScan({
  vaultManager,
  logger,
  connectionInfoGet,
  db,
}: {
  vaultManager: VaultManager;
  logger: Logger;
  connectionInfoGet: ConnectionInfoGet;
  db: DB;
}) {
  return async (
    call: grpc.ServerWritableStream<utilsPB.EmptyMessage, vaultsPB.List>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, true);
    const listMessage = new vaultsPB.List();
    // Getting the NodeId from the ReverseProxy connection info
    const connectionInfo = connectionInfoGet(call);
    // If this is getting run the connection exists
    // It SHOULD exist here
    if (connectionInfo == null) {
      throw new agentErrors.ErrorConnectionInfoMissing();
    }
    const nodeId = connectionInfo.remoteNodeId;
    try {
      await db.withTransactionF(async (tran) => {
        const listResponse = vaultManager.handleScanVaults(nodeId, tran);
        for await (const {
          vaultId,
          vaultName,
          vaultPermissions,
        } of listResponse) {
          listMessage.setVaultId(vaultsUtils.encodeVaultId(vaultId));
          listMessage.setVaultName(vaultName);
          listMessage.setVaultPermissionsList(vaultPermissions);
          await genWritable.next(listMessage);
        }
      });
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      !agentUtils.isAgentClientError(e, [
        agentErrors.ErrorConnectionInfoMissing,
        vaultsErrors.ErrorVaultsPermissionDenied,
      ]) && logger.error(`${vaultsScan.name}:${e}`);
      return;
    }
  };
}

export default vaultsScan;
