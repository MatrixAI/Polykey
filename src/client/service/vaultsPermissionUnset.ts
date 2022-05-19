import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type ACL from '../../acl/ACL';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import type Logger from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import * as vaultsErrors from '../../vaults/errors';
import * as validationUtils from '../../validation/utils';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function vaultsPermissionUnset({
  authenticate,
  vaultManager,
  gestaltGraph,
  acl,
  db,
  logger,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
  gestaltGraph: GestaltGraph;
  acl: ACL;
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
      const vaultsPermissionsMessage = call.request;
      const vaultMessage = vaultsPermissionsMessage.getVault();
      const nodeMessage = vaultsPermissionsMessage.getNode();
      if (vaultMessage == null || nodeMessage == null) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      await db.withTransactionF(async (tran) => {
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
        const vaultMeta = await vaultManager.getVaultMeta(vaultId, tran);
        if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
        // Unsetting permissions
        await gestaltGraph.setGestaltActionByNode(nodeId, 'scan', tran);
        for (const action of actions) {
          await acl.unsetVaultAction(vaultId, nodeId, action, tran);
        }
        // We need to check if there are still shared vaults
        const nodePermissions = await acl.getNodePerm(nodeId, tran);
        // Remove scan permissions if no more shared vaults
        if (nodePermissions != null) {
          // Counting total number of permissions
          const totalPermissions = Object.keys(nodePermissions.vaults)
            .map((key) => Object.keys(nodePermissions.vaults[key]).length)
            .reduce((prev, current) => current + prev);
          // If no permissions are left then we remove the scan permission
          if (totalPermissions === 0) {
            await gestaltGraph.unsetGestaltActionByNode(nodeId, 'scan', tran);
          }
        }
      });
      // Formatting response
      const response = new utilsPB.StatusMessage().setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default vaultsPermissionUnset;
