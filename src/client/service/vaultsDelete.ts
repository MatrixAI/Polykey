import type { Authenticate } from '../types';
import type { VaultId, VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import type * as grpc from '@grpc/grpc-js';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import { utils as idUtils } from '@matrixai/id';
import { utils as grpcUtils } from '../../grpc';
import { errors as vaultsErrors } from '../../vaults';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function decodeVaultId(input: string): VaultId | undefined {
  return idUtils.fromMultibase(input)
    ? (idUtils.fromMultibase(input) as VaultId)
    : undefined;
}

function vaultsDelete({
  vaultManager,
  authenticate,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Vault, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    const vaultMessage = call.request;
    try {
      const response = new utilsPB.StatusMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const nameOrId = vaultMessage.getNameOrId();
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      if (!vaultId) vaultId = decodeVaultId(nameOrId);
      if (!vaultId) throw new vaultsErrors.ErrorVaultsVaultUndefined();
      await vaultManager.destroyVault(vaultId);
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default vaultsDelete;
