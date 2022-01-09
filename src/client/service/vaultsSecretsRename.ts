import type { Authenticate } from '../types';
import type { VaultId, VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import type * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';
import * as grpc from '@grpc/grpc-js';
import { utils as idUtils } from '@matrixai/id';
import { utils as grpcUtils } from '../../grpc';
import { vaultOps, errors as vaultsErrors } from '../../vaults';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function decodeVaultId(input: string): VaultId | undefined {
  return idUtils.fromMultibase(input)
    ? (idUtils.fromMultibase(input) as VaultId)
    : undefined;
}

function vaultsSecretsRename({
  vaultManager,
  authenticate,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<secretsPB.Rename, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    const response = new utilsPB.StatusMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const secretMessage = call.request.getOldSecret();
      if (!secretMessage) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const vaultMessage = secretMessage.getVault();
      if (vaultMessage == null) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const nameOrId = vaultMessage.getNameOrId();
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      if (!vaultId) vaultId = decodeVaultId(nameOrId);
      if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
      const vault = await vaultManager.openVault(vaultId);
      const oldSecret = secretMessage.getSecretName();
      const newSecret = call.request.getNewName();
      await vaultOps.renameSecret(vault, oldSecret, newSecret);
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default vaultsSecretsRename;
