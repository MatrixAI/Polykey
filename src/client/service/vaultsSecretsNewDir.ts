import type { Authenticate } from '../types';
import type { VaultId, VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import type { FileSystem } from '../../types';
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

function vaultsSecretsNewDir({
  vaultManager,
  authenticate,
  fs,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
  fs: FileSystem;
}) {
  return async (
    call: grpc.ServerUnaryCall<secretsPB.Directory, utilsPB.EmptyMessage>,
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
      if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
      const vault = await vaultManager.openVault(vaultId);
      const secretsPath = call.request.getSecretDirectory();
      await vaultOps.addSecretDirectory(vault, secretsPath, fs);
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default vaultsSecretsNewDir;
