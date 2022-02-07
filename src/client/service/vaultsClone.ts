import type { Authenticate } from '../types';
import type { VaultManager } from '../../vaults';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as validationUtils from '../../validation/utils';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';

function vaultsClone({
  authenticate,
  vaultManager,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
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
      vaultId = vaultManager.getVaultId(vaultNameOrId)
      vaultId = vaultId ?? vaultsUtils.decodeVaultId(vaultNameOrId);
      if (vaultId == null) throw new vaultsErrors.ErrorVaultsVaultUndefined();
      // Node id
      const nodeId = validationUtils.parseNodeId(nodeMessage.getNodeId());
      await vaultManager.cloneVault(nodeId, vaultId);
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default vaultsClone;
