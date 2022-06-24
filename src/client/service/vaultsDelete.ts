import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as clientUtils from '../utils';

function vaultsDelete({
  authenticate,
  vaultManager,
  db,
  logger,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Vault, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.StatusMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      await db.withTransactionF(async (tran) => {
        const vaultIdFromName = await vaultManager.getVaultId(
          call.request.getNameOrId() as VaultName,
          tran,
        );
        const vaultId =
          vaultIdFromName ??
          vaultsUtils.decodeVaultId(call.request.getNameOrId());
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined();
        }
        await vaultManager.destroyVault(vaultId, tran);
      });
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        vaultsErrors.ErrorVaultsVaultUndefined,
      ]) && logger.error(`${vaultsDelete.name}:${e}`);
      return;
    }
  };
}

export default vaultsDelete;
