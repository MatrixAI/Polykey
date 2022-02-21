import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as grpc from '@grpc/grpc-js';
import * as validationUtils from '../../validation/utils';
import { utils as grpcUtils } from '../../grpc';
import { vaultOps } from '../../vaults';
import * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';

function vaultsSecretsGet({
  vaultManager,
  authenticate,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<secretsPB.Secret, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<secretsPB.Secret>,
  ): Promise<void> => {
    try {
      const response = new secretsPB.Secret();
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
      const secretName = call.request.getSecretName();
      const secretContent = await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          return await vaultOps.getSecret(vault, secretName);
        },
      );
      response.setSecretContent(secretContent);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default vaultsSecretsGet;
