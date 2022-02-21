import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as grpc from '@grpc/grpc-js';
import * as validationUtils from '../../validation/utils';
import { utils as grpcUtils } from '../../grpc';
import { vaultOps } from '../../vaults';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function vaultsSecretsMkdir({
  vaultManager,
  authenticate,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Mkdir, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.StatusMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const vaultMkdirMessge = call.request;
      const vaultMessage = vaultMkdirMessge.getVault();
      if (vaultMessage == null) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const nameOrId = vaultMessage.getNameOrId();
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      vaultId = vaultId ?? validationUtils.parseVaultId(nameOrId);
      await vaultManager.withVaults([vaultId], async (vault) => {
        await vaultOps.mkdir(vault, vaultMkdirMessge.getDirName(), {
          recursive: vaultMkdirMessge.getRecursive(),
        });
      });
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default vaultsSecretsMkdir;
