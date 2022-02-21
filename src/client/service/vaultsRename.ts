import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import * as grpc from '@grpc/grpc-js';
import * as validationUtils from '../../validation/utils';
import { utils as grpcUtils } from '../../grpc';
import { utils as vaultsUtils } from '../../vaults';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function vaultsRename({
  vaultManager,
  authenticate,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Rename, vaultsPB.Vault>,
    callback: grpc.sendUnaryData<vaultsPB.Vault>,
  ): Promise<void> => {
    try {
      const response = new vaultsPB.Vault();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const vaultMessage = call.request.getVault();
      if (vaultMessage == null) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const nameOrId = vaultMessage.getNameOrId();
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      vaultId = vaultId ?? validationUtils.parseVaultId(nameOrId);
      const newName = call.request.getNewName() as VaultName;
      await vaultManager.renameVault(vaultId, newName);
      response.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default vaultsRename;
