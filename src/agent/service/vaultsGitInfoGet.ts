import type { VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import * as grpc from '@grpc/grpc-js';
import { utils as idUtils } from '@matrixai/id';
import { utils as grpcUtils } from '../../grpc';
import { utils as vaultsUtils, errors as vaultsErrors } from '../../vaults';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function vaultsGitInfoGet({ vaultManager }: { vaultManager: VaultManager }) {
  return async (
    call: grpc.ServerWritableStream<vaultsPB.Vault, vaultsPB.PackChunk>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    const request = call.request;
    const vaultNameOrId = request.getNameOrId();
    let vaultId, vaultName;
    try {
      vaultId = vaultsUtils.makeVaultId(idUtils.fromString(vaultNameOrId));
      await vaultManager.openVault(vaultId);
      vaultName = await vaultManager.getVaultName(vaultId);
    } catch (err) {
      if (err instanceof vaultsErrors.ErrorVaultUndefined) {
        vaultId = await vaultManager.getVaultId(vaultNameOrId as VaultName);
        await vaultManager.openVault(vaultId);
        vaultName = vaultNameOrId;
      } else {
        throw err;
      }
    }
    // TODO: Check the permissions here
    const meta = new grpc.Metadata();
    meta.set('vaultName', vaultName);
    meta.set('vaultId', vaultsUtils.makeVaultIdPretty(vaultId));
    genWritable.stream.sendMetadata(meta);
    const response = new vaultsPB.PackChunk();
    const responseGen = vaultManager.handleInfoRequest(vaultId);
    for await (const byte of responseGen) {
      if (byte !== null) {
        response.setChunk(byte);
        await genWritable.next(response);
      } else {
        await genWritable.next(null);
      }
    }
    await genWritable.next(null);
  };
}

export default vaultsGitInfoGet;
