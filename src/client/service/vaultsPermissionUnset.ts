import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type { NodeId } from '../../ids/types';
import type { VaultName, VaultAction } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type ACL from '../../acl/ACL';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import type Logger from '@matrixai/logger';
import type * as grpc from '@grpc/grpc-js';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as grpcUtils from '../../grpc/utils';
import * as gestaltsErrors from '../../gestalts/errors';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import { matchSync } from '../../utils';
import * as clientUtils from '../utils';

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
        // Unsetting permissions
        await gestaltGraph.setGestaltActions(['node', nodeId], 'scan', tran);
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
            await gestaltGraph.unsetGestaltActions(['node', nodeId], 'scan', tran);
          }
        }
      });
      // Formatting response
      const response = new utilsPB.StatusMessage().setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        vaultsErrors.ErrorVaultsVaultUndefined,
        gestaltsErrors.ErrorGestaltsGraphNodeIdMissing,
      ]) && logger.error(`${vaultsPermissionUnset.name}:${e}`);
      return;
    }
  };
}

export default vaultsPermissionUnset;
