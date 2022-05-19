import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type Logger from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import * as validationUtils from '../../validation/utils';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

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
      const vaultsVersionMessage = call.request;
      // Getting vault ID
      const vaultMessage = vaultsVersionMessage.getVault();
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
        // Doing the deed
        const versionId = vaultsVersionMessage.getVersionId();
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
      logger.error(e);
      return;
    }
  };
}

export default vaultsVersion;
