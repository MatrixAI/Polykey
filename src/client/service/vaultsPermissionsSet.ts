import type { Authenticate } from '../types';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function vaultsPermissionsSet({
  authenticate,
}: {
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.PermSet, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);

      const nodeMessage = call.request.getNode();
      if (nodeMessage == null) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      // Const node = makeNodeId(nodeMessage.getNodeId());
      const vaultMessage = call.request.getVault();
      if (vaultMessage == null) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      // Const id = await parseVaultInput(vaultMessage, vaultManager);
      throw Error('Not Implemented');
      // Await vaultManager.setVaultPermissions(node, id); // FIXME
      const response = new utilsPB.StatusMessage();
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default vaultsPermissionsSet;
