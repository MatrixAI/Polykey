import type { Authenticate } from '../types';
import type { VaultManager } from '../../vaults';
import type { VaultName } from '../../vaults/types';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as validationUtils from '../../validation/utils';

function vaultsUnshare({
  authenticate,
  vaultManager,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.PermUnset, utilsPB.StatusMessage>,
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
      const nodeId = validationUtils.parseNodeId(nodeMessage.getNodeId());
      const vaultMessage = call.request.getVault();
      if (vaultMessage == null) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const nameOrId = vaultMessage.getNameOrId();
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      vaultId = vaultId ?? validationUtils.parseVaultId(nameOrId);
      await vaultManager.unshareVault(vaultId, nodeId);
      const response = new utilsPB.StatusMessage();
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default vaultsUnshare;
