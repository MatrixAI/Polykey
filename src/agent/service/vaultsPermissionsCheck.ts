import type * as grpc from '@grpc/grpc-js';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import { utils as grpcUtils } from '../../grpc';

function vaultsPermissionsCheck(_) {
  return async (
    call: grpc.ServerUnaryCall<
      vaultsPB.NodePermission,
      vaultsPB.NodePermissionAllowed
    >,
    callback: grpc.sendUnaryData<vaultsPB.NodePermissionAllowed>,
  ): Promise<void> => {
    // Const response = new vaultsPB.NodePermissionAllowed();
    try {
      // Const nodeId = makeNodeId(call.request.getNodeId());
      // const vaultId = makeVaultId(call.request.getVaultId());
      throw Error('Not Implemented');
      // FIXME: getVaultPermissions not implemented.
      // const result = await vaultManager.getVaultPermissions(vaultId, nodeId);
      // let result;
      // if (result[nodeId] === undefined) {
      //   response.setPermission(false);
      // } else if (result[nodeId]['pull'] === undefined) {
      //   response.setPermission(false);
      // } else {
      //   response.setPermission(true);
      // }
      // callback(null, response);
    } catch (e) {
      callback(grpcUtils.fromError(e));
    }
  };
}

export default vaultsPermissionsCheck;
