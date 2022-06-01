import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type { VaultName, VaultId } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';
import type Logger from '@matrixai/logger';
import type * as grpc from '@grpc/grpc-js';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import { matchSync } from '../../utils';
import * as clientUtils from '../utils';

function vaultsSecretsRename({
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
    call: grpc.ServerUnaryCall<secretsPB.Rename, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.StatusMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      await db.withTransactionF(async (tran) => {
        const vaultIdFromName = await vaultManager.getVaultId(
          call.request.getOldSecret()?.getVault()?.getNameOrId() as VaultName,
          tran,
        );
        const {
          vaultId,
        }: {
          vaultId: VaultId;
        } = validateSync(
          (keyPath, value) => {
            return matchSync(keyPath)(
              [
                ['vaultId'],
                () => vaultIdFromName ?? validationUtils.parseVaultId(value),
              ],
              () => value,
            );
          },
          {
            vaultId: call.request.getOldSecret()?.getVault()?.getNameOrId(),
          },
        );
        const oldSecret = call.request.getOldSecret()?.getSecretName();
        if (oldSecret == null) {
          throw new vaultsErrors.ErrorSecretsSecretUndefined();
        }
        const newSecret = call.request.getNewName();
        await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            await vaultOps.renameSecret(vault, oldSecret, newSecret);
          },
          tran,
        );
      });
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientError(e, [
        vaultsErrors.ErrorVaultsVaultUndefined,
        vaultsErrors.ErrorSecretsSecretUndefined,
      ]) && logger.error(e);
      return;
    }
  };
}

export default vaultsSecretsRename;
