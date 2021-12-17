import type { Authenticate } from '../types';
import type { Vault, VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import type { FileSystem } from '../../types';
import * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '../../grpc';
import { utils as vaultsUtils } from '../../vaults';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function vaultsCreate({
  vaultManager,
  authenticate,
  fs,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
  fs: FileSystem;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Vault, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<vaultsPB.Vault>,
  ): Promise<void> => {
    const response = new vaultsPB.Vault();
    let vault: Vault;
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      vault = await vaultManager.createVault(
        call.request.getNameOrId() as VaultName,
      );
      response.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default vaultsCreate;
