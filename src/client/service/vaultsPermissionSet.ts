import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type ACL from '../../acl/ACL';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type { VaultActions } from '../../vaults/types';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as grpc from '@grpc/grpc-js';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as validationUtils from '../../validation/utils';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function vaultsPermissionSet({
  vaultManager,
  authenticate,
  gestaltGraph,
  acl,
  notificationsManager,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
  acl: ACL;
  notificationsManager: NotificationsManager;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Permissions, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      // Checking session token
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const vaultsPermissionsMessage = call.request;
      const vaultMessage = vaultsPermissionsMessage.getVault();
      const nodeMessage = vaultsPermissionsMessage.getNode();
      if (vaultMessage == null || nodeMessage == null) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      // Parsing VaultId
      const nameOrId = vaultMessage.getNameOrId();
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      vaultId = vaultId ?? validationUtils.parseVaultId(nameOrId);
      // Parsing NodeId
      const nodeId = validationUtils.parseNodeId(nodeMessage.getNodeId());
      // Parsing actions
      const actions = vaultsPermissionsMessage
        .getVaultPermissionsList()
        .map((vaultAction) => validationUtils.parseVaultAction(vaultAction));
      // Checking if vault exists
      const vaultMeta = await vaultManager.getVaultMeta(vaultId);
      if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
      // Setting permissions
      const actionsSet: VaultActions = {};
      await gestaltGraph.setGestaltActionByNode(nodeId, 'scan');
      for (const action of actions) {
        await acl.setVaultAction(vaultId, nodeId, action);
        actionsSet[action] = null;
      }
      // Sending notification
      await notificationsManager.sendNotification(nodeId, {
        type: 'VaultShare',
        vaultId: vaultsUtils.encodeVaultId(vaultId),
        vaultName: vaultMeta.vaultName,
        actions: actionsSet,
      });
      // Formatting response
      const response = new utilsPB.StatusMessage().setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default vaultsPermissionSet;
