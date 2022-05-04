import type { Authenticate } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import type Logger from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as validationUtils from '../../validation/utils';
import * as vaultsUtils from '../../vaults/utils';

function vaultsClone({
  authenticate,
  vaultManager,
  logger,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Clone, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.StatusMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);

      const vaultMessage = call.request.getVault();
      if (vaultMessage == null) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const nodeMessage = call.request.getNode();
      if (nodeMessage == null) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      // Vault id
      let vaultId;
      const vaultNameOrId = vaultMessage.getNameOrId();
      vaultId = vaultsUtils.decodeVaultId(vaultNameOrId);
      vaultId = vaultId ?? vaultNameOrId;
      // Node id
      const nodeId = validationUtils.parseNodeId(nodeMessage.getNodeId());
      await vaultManager.cloneVault(nodeId, vaultId);
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default vaultsClone;
