import type { Authenticate } from '../types';
import type { VaultManager } from '../../vaults';
import type { VaultId, VaultName } from '../../vaults/types';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as grpc from '@grpc/grpc-js';
import { utils as idUtils } from '@matrixai/id';
import { errors as vaultsErrors } from '../../vaults';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as validationUtils from '../../validation/utils';

function decodeVaultId(input: string): VaultId | undefined {
  return idUtils.fromMultibase(input)
    ? (idUtils.fromMultibase(input) as VaultId)
    : undefined;
}

function vaultsPull({
  authenticate,
  vaultManager,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
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
      if (!vaultId) vaultId = decodeVaultId(nameOrId);
      if (!vaultId) throw new vaultsErrors.ErrorVaultsVaultUndefined();
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
        try {
          pullVault = decodeVaultId(pullVaultMessage.getNameOrId());
        } catch (err) {
          // Do nothing
        }
        if (!pullVault) pullVault = pullVaultMessage.getNameOrId();
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
      return;
    }
  };
}

export default vaultsPull;
