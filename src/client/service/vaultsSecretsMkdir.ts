import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import type Logger from '@matrixai/logger';
import type * as grpc from '@grpc/grpc-js';
import * as vaultsUtils from '../../vaults/utils';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

function vaultsSecretsMkdir({
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
    call: grpc.ServerUnaryCall<vaultsPB.Mkdir, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.StatusMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      await db.withTransactionF(async (tran) => {
        const vaultIdFromName = await vaultManager.getVaultId(
          call.request.getVault()?.getNameOrId() as VaultName,
          tran,
        );
        const vaultId =
          vaultIdFromName ??
          vaultsUtils.decodeVaultId(call.request.getVault()?.getNameOrId());
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined();
        }
        await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            await vaultOps.mkdir(vault, call.request.getDirName(), {
              recursive: call.request.getRecursive(),
            });
          },
          tran,
        );
      });
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        vaultsErrors.ErrorVaultsVaultUndefined,
        vaultsErrors.ErrorVaultsRecursive,
      ]) && logger.error(`${vaultsSecretsMkdir.name}:${e}`);
      return;
    }
  };
}

export default vaultsSecretsMkdir;
