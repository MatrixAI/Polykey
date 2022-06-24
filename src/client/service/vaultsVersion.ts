import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type Logger from '@matrixai/logger';
import type * as grpc from '@grpc/grpc-js';
import * as vaultsUtils from '../../vaults/utils';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as clientUtils from '../utils';

function vaultsVersion({
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
    call: grpc.ServerUnaryCall<vaultsPB.Version, vaultsPB.VersionResult>,
    callback: grpc.sendUnaryData<vaultsPB.VersionResult>,
  ): Promise<void> => {
    try {
      const response = new vaultsPB.VersionResult();
      // Checking session token
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
        // Doing the deed
        const versionId = call.request.getVersionId();
        const [latestOid, currentVersionId] = await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            const latestOid = (await vault.log())[0].commitId;
            await vault.version(versionId);
            const currentVersionId = (await vault.log(versionId, 0))[0]
              ?.commitId;
            return [latestOid, currentVersionId];
          },
          tran,
        );
        // Checking if latest version ID
        const isLatestVersion = latestOid === currentVersionId;
        // Creating message
        response.setIsLatestVersion(isLatestVersion);
      });
      // Sending message
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        vaultsErrors.ErrorVaultsVaultUndefined,
        vaultsErrors.ErrorVaultReferenceInvalid,
        vaultsErrors.ErrorVaultReferenceMissing,
      ]) && logger.error(`${vaultsVersion.name}:${e}`);
      return;
    }
  };
}

export default vaultsVersion;
