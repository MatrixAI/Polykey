import type { Authenticate } from '../types';
import type { VaultManager } from '../../vaults';
import type { VaultName } from '../../vaults/types';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import type * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '../../grpc';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as permissionsPB from '../../proto/js/polykey/v1/permissions/permissions_pb';
import * as validationUtils from '../../validation/utils';

function vaultsPermissionsGet({
  authenticate,
  vaultManager,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
}) {
  return async (
    call: grpc.ServerWritableStream<vaultsPB.Vault, permissionsPB.NodeActions>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    try {
      const vaultMessage = call.request;
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Getting vaultId
      const nameOrId = vaultMessage.getNameOrId();
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      vaultId = vaultId ?? validationUtils.parseVaultId(nameOrId);

      const permissionList = await vaultManager.getVaultPermission(vaultId);
      const nodeActionsMessage = new permissionsPB.NodeActions();
      const nodeMessage = new nodesPB.Node();

      // Constructing the message.
      for (const nodeId in permissionList) {
        nodeMessage.setNodeId(nodeId);
        nodeActionsMessage.setNode(nodeMessage);
        nodeActionsMessage.clearActionsList();
        for (const action in permissionList[nodeId]) {
          nodeActionsMessage.addActions(action);
        }
        await genWritable.next(nodeActionsMessage);
      }

      await genWritable.next(null);
      return;
    } catch (err) {
      await genWritable.throw(err);
      return;
    }
  };
}

export default vaultsPermissionsGet;
