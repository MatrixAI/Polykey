import type * as grpc from '@grpc/grpc-js';
import type VaultManager from '../../vaults/VaultManager';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type { ConnectionInfoGet } from '../../agent/types';
import * as agentErrors from '../../agent/errors';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as vaultsUtils from '../../vaults/utils';
import * as grpcUtils from '../../grpc/utils';

function vaultsScan({
  vaultManager,
  connectionInfoGet,
}: {
  vaultManager: VaultManager;
  connectionInfoGet: ConnectionInfoGet;
}) {
  return async (
    call: grpc.ServerWritableStream<utilsPB.EmptyMessage, vaultsPB.List>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    const listMessage = new vaultsPB.List();
    // Getting the NodeId from the ReverseProxy connection info
    const connectionInfo = connectionInfoGet(call);
    // If this is getting run the connection exists
    // It SHOULD exist here
    if (connectionInfo == null) {
      throw new agentErrors.ErrorConnectionInfoMissing();
    }
    const nodeId = connectionInfo.nodeId;
    try {
      const listResponse = vaultManager.handleScanVaults(nodeId);
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
      await genWritable.next(null);
    } catch (e) {
      await genWritable.throw(e);
    }
  };
}

export default vaultsScan;
