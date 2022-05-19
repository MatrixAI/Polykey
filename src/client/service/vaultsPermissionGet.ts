import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultName } from '../../vaults/types';
import type { VaultActions } from '../../vaults/types';
import type ACL from '../../acl/ACL';
import type { NodeId, NodeIdEncoded } from 'nodes/types';
import type Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import * as grpcUtils from '../../grpc/utils';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as validationUtils from '../../validation/utils';
import * as nodesUtils from '../../nodes/utils';

function vaultsPermissionGet({
  authenticate,
  vaultManager,
  acl,
  db,
  logger,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
  acl: ACL;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerWritableStream<vaultsPB.Vault, vaultsPB.Permissions>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const vaultMessage = call.request;
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Getting vaultId
      const nameOrId = vaultMessage.getNameOrId();
      const [rawPermissions, vaultId] = await db.withTransactionF(
        async (tran) => {
          let vaultId = await vaultManager.getVaultId(
            nameOrId as VaultName,
            tran,
          );
          vaultId = vaultId ?? validationUtils.parseVaultId(nameOrId);
          // Getting permissions
          return [await acl.getVaultPerm(vaultId, tran), vaultId];
        },
      );
      const permissionList: Record<NodeIdEncoded, VaultActions> = {};
      // Getting the relevant information
      for (const nodeId in rawPermissions) {
        permissionList[nodeId] = rawPermissions[nodeId].vaults[vaultId];
      }

      const vaultPermissionsMessage = new vaultsPB.Permissions();
      vaultPermissionsMessage.setVault(vaultMessage);
      const nodeMessage = new nodesPB.Node();

      // Constructing the message
      for (const nodeIdString in permissionList) {
        const nodeId = IdInternal.fromString<NodeId>(nodeIdString);
        nodeMessage.setNodeId(nodesUtils.encodeNodeId(nodeId));
        vaultPermissionsMessage.setNode(nodeMessage);
        const actions = Object.keys(permissionList[nodeIdString]);
        vaultPermissionsMessage.setVaultPermissionsList(actions);
        await genWritable.next(vaultPermissionsMessage);
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      logger.error(e);
      return;
    }
  };
}

export default vaultsPermissionGet;
