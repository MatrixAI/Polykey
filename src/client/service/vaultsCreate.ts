import type { Authenticate } from '../types';
import type { VaultId, VaultName } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type * as grpc from '@grpc/grpc-js';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function vaultsCreate({
  authenticate,
  vaultManager,
  logger,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Vault, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<vaultsPB.Vault>,
  ): Promise<void> => {
    const response = new vaultsPB.Vault();
    let vaultId: VaultId;
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      vaultId = await vaultManager.createVault(
        call.request.getNameOrId() as VaultName,
      );
      response.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default vaultsCreate;
