import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import type Logger from '@matrixai/logger';
import * as validationUtils from '../../validation/utils';
import * as grpcUtils from '../../grpc/utils';
import * as vaultOps from '../../vaults/VaultOps';
import * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';

function vaultsSecretsList({
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
    call: grpc.ServerWritableStream<vaultsPB.Vault, secretsPB.Secret>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const vaultMessage = call.request;
      const nameOrId = vaultMessage.getNameOrId();
      const secrets = await db.withTransactionF(async (tran) => {
        let vaultId = await vaultManager.getVaultId(
          nameOrId as VaultName,
          tran,
        );
        vaultId = vaultId ?? validationUtils.parseVaultId(nameOrId);
        return await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            return await vaultOps.listSecrets(vault);
          },
          tran,
        );
      });
      let secretMessage: secretsPB.Secret;
      for (const secret of secrets) {
        secretMessage = new secretsPB.Secret();
        secretMessage.setSecretName(secret);
        await genWritable.next(secretMessage);
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      logger.error(e);
      return;
    }
  };
}

export default vaultsSecretsList;
