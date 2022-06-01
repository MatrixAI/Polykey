import type { DB } from '@matrixai/db';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultName, VaultId } from '../../vaults/types';
import type { Authenticate } from '../types';
import type Logger from '@matrixai/logger';
import type * as grpc from '@grpc/grpc-js';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';
import { matchSync } from '../../utils';
import * as clientUtils from '../utils';

function vaultsSecretsStat({
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
    call: grpc.ServerUnaryCall<secretsPB.Secret, secretsPB.Stat>,
    callback: grpc.sendUnaryData<secretsPB.Stat>,
  ): Promise<void> => {
    try {
      const response = new secretsPB.Stat();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      await db.withTransactionF(async (tran) => {
        const vaultIdFromName = await vaultManager.getVaultId(
          call.request.getVault()?.getNameOrId() as VaultName,
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
            vaultId: call.request.getVault()?.getNameOrId(),
          },
        );
        const secretName = call.request.getSecretName();
        const stat = await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            return await vaultOps.statSecret(vault, secretName);
          },
          tran,
        );
        response.setJson(JSON.stringify(stat));
      });
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

export default vaultsSecretsStat;
