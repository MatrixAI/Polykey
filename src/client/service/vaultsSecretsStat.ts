import type { DB } from '@matrixai/db';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultName } from '../../vaults/types';
import type { Authenticate } from '../types';
import type Logger from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import * as validationUtils from '../../validation/utils';
import * as grpcUtils from '../../grpc/utils';
import * as vaultOps from '../../vaults/VaultOps';
import * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';

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
      const vaultMessage = call.request.getVault();
      if (vaultMessage == null) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const nameOrId = vaultMessage.getNameOrId();
      await db.withTransactionF(async (tran) => {
        let vaultId = await vaultManager.getVaultId(
          nameOrId as VaultName,
          tran,
        );
        vaultId = vaultId ?? validationUtils.parseVaultId(nameOrId);
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
      logger.error(e);
      return;
    }
  };
}

export default vaultsSecretsStat;
