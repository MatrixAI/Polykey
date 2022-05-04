import type { Authenticate } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultName } from '../../vaults/types';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import type Logger from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as validationUtils from '../../validation/utils';
import * as vaultsUtils from '../../vaults/utils';

function vaultsPull({
  authenticate,
  vaultManager,
  logger,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Pull, utilsPB.StatusMessage>,
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
      const nameOrId = vaultMessage.getNameOrId();
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      vaultId = vaultId ?? validationUtils.parseVaultId(nameOrId);
      let nodeId;
      const nodeMessage = call.request.getNode();
      if (nodeMessage == null) {
        nodeId = null;
      } else {
        nodeId = validationUtils.parseNodeId(nodeMessage.getNodeId());
      }
      let pullVault;
      const pullVaultMessage = call.request.getPullVault();
      if (pullVaultMessage == null) {
        pullVault = null;
      } else {
        pullVault = vaultsUtils.decodeVaultId(pullVaultMessage.getNameOrId());
        pullVault = pullVault ?? pullVaultMessage.getNameOrId();
        if (pullVault == null) pullVault = pullVaultMessage.getNameOrId();
      }
      await vaultManager.pullVault({
        vaultId,
        pullNodeId: nodeId,
        pullVaultNameOrId: pullVault,
      });
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

export default vaultsPull;
