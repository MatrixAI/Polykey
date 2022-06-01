import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type { VaultName, VaultId } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type Logger from '@matrixai/logger';
import type * as grpc from '@grpc/grpc-js';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import { matchSync } from '../../utils';
import * as clientUtils from '../utils';

function vaultsRename({
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
    call: grpc.ServerUnaryCall<vaultsPB.Rename, vaultsPB.Vault>,
    callback: grpc.sendUnaryData<vaultsPB.Vault>,
  ): Promise<void> => {
    try {
      const response = new vaultsPB.Vault();
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
        const newName = call.request.getNewName() as VaultName;
        await vaultManager.renameVault(vaultId, newName, tran);
        response.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      });
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientError(e, [
        vaultsErrors.ErrorVaultsVaultUndefined,
        vaultsErrors.ErrorVaultsVaultDefined,
      ]) && logger.error(e);
      return;
    }
  };
}

export default vaultsRename;
