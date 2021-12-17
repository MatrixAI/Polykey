import type { Authenticate } from '../types';
import type { Vault, VaultId, VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import type { FileSystem } from '../../types';
import * as grpc from '@grpc/grpc-js';
import { utils as idUtils } from '@matrixai/id';
import { utils as grpcUtils } from '../../grpc';
import {
  vaultOps,
  errors as vaultsErrors,
} from '../../vaults';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';

function decodeVaultId(input: string): VaultId | undefined {
  return idUtils.fromMultibase(input)
    ? (idUtils.fromMultibase(input) as VaultId)
    : undefined;
}

function vaultsSecretsList({
  vaultManager,
  authenticate,
  fs,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
  fs: FileSystem;
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
    } catch (err) {
      await genWritable.throw(err);
      return;
    }
  };
}

export default vaultsSecretsList;
