import type { Authenticate } from '../types';
import type { VaultId, VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import type * as grpc from '@grpc/grpc-js';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import { utils as idUtils } from '@matrixai/id';
import { utils as grpcUtils } from '../../grpc';
import { vaultOps, errors as vaultsErrors } from '../../vaults';
import * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';

function decodeVaultId(input: string): VaultId | undefined {
  return idUtils.fromMultibase(input)
    ? (idUtils.fromMultibase(input) as VaultId)
    : undefined;
}

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
    const genWritable = grpcUtils.generatorWritable(call);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const vaultMessage = call.request;
      const nameOrId = vaultMessage.getNameOrId();
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      if (!vaultId) vaultId = decodeVaultId(nameOrId);
      if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
      const vault = await vaultManager.openVault(vaultId);
      const secrets = await vaultOps.listSecrets(vault);
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
