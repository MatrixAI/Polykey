import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type { NodeId } from '../../nodes/types';
import type { VaultName, VaultAction, VaultActions } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type ACL from '../../acl/ACL';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import type Logger from '@matrixai/logger';
import type * as grpc from '@grpc/grpc-js';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as grpcUtils from '../../grpc/utils';
import * as aclErrors from '../../acl/errors';
import * as nodesErrors from '../../nodes/errors';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import { matchSync } from '../../utils';
import * as clientUtils from '../utils';

function vaultsPermissionSet({
  authenticate,
  vaultManager,
  gestaltGraph,
  acl,
  notificationsManager,
  db,
  logger,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
  gestaltGraph: GestaltGraph;
  acl: ACL;
  notificationsManager: NotificationsManager;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Permissions, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      // Checking session token
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      await db.withTransactionF(async (tran) => {
        const vaultIdFromName = await vaultManager.getVaultId(
          call.request.getVault()?.getNameOrId() as VaultName,
          tran,
        );
        const vaultId =
          vaultIdFromName ??
          vaultsUtils.decodeVaultId(call.request.getVault()?.getNameOrId());
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined();
        }
        const {
          nodeId,
          actions,
        }: {
          nodeId: NodeId;
          actions: Array<VaultAction>;
        } = validateSync(
          (keyPath, value) => {
            return matchSync(keyPath)(
              [['nodeId'], () => validationUtils.parseNodeId(value)],
              [['actions'], () => value.map(validationUtils.parseVaultAction)],
              () => value,
            );
          },
          {
            nodeId: call.request.getNode()?.getNodeId(),
            actions: call.request.getVaultPermissionsList(),
          },
        );
        // Checking if vault exists
        const vaultMeta = await vaultManager.getVaultMeta(vaultId, tran);
        if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
        // Setting permissions
        const actionsSet: VaultActions = {};
        await gestaltGraph.setGestaltActionByNode(nodeId, 'scan', tran);
        for (const action of actions) {
          await acl.setVaultAction(vaultId, nodeId, action, tran);
          actionsSet[action] = null;
        }
        // Sending notification
        await notificationsManager.sendNotification(nodeId, {
          type: 'VaultShare',
          vaultId: vaultsUtils.encodeVaultId(vaultId),
          vaultName: vaultMeta.vaultName,
          actions: actionsSet,
        });
      });
      // Formatting response
      const response = new utilsPB.StatusMessage().setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        vaultsErrors.ErrorVaultsVaultUndefined,
        aclErrors.ErrorACLNodeIdMissing,
        nodesErrors.ErrorNodeGraphNodeIdNotFound,
      ]) && logger.error(`${vaultsPermissionSet.name}:${e}`);
      return;
    }
  };
}

export default vaultsPermissionSet;
