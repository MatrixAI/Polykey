import type { Authenticate } from '../types';
import type { VaultId, VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import * as grpc from '@grpc/grpc-js';
import { utils as idUtils } from '@matrixai/id';
import { utils as grpcUtils } from '../../grpc';
import { errors as vaultsErrors } from '../../vaults';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function decodeVaultId(input: string): VaultId | undefined {
  return idUtils.fromMultibase(input)
    ? (idUtils.fromMultibase(input) as VaultId)
    : undefined;
}

function vaultsVersion({
  vaultManager,
  authenticate,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Version, vaultsPB.VersionResult>,
    callback: grpc.sendUnaryData<vaultsPB.VersionResult>,
  ): Promise<void> => {
    const response = new vaultsPB.VersionResult();
    try {
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
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      if (!vaultId) vaultId = decodeVaultId(nameOrId);
      if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();

      // Doing the deed
      const vault = await vaultManager.openVault(vaultId);
      const latestOid = (await vault.log())[0].oid;
      const versionId = vaultsVersionMessage.getVersionId();

      await vault.version(versionId);
      const currentVersionId = (await vault.log(0, versionId))[0]?.oid;

      // Checking if latest version ID.
      const isLatestVersion = latestOid === currentVersionId;

      // Creating message
      response.setIsLatestVersion(isLatestVersion);

      // Sending message
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default vaultsVersion;
