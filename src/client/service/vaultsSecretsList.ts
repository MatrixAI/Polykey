import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type * as grpc from '@grpc/grpc-js';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as validationUtils from '../../validation/utils';
import * as grpcUtils from '../../grpc/utils';
import * as vaultOps from '../../vaults/VaultOps';
import * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';

function vaultsSecretsList({
  vaultManager,
  authenticate,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
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
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      vaultId = vaultId ?? validationUtils.parseVaultId(nameOrId);
      const secrets = await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          return await vaultOps.listSecrets(vault);
        },
      );
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
      return;
    }
  };
}

export default vaultsSecretsList;
