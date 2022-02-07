import type * as grpc from '@grpc/grpc-js';
import type { VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import { errors as grpcErrors, utils as grpcUtils } from '../../grpc';
import { utils as vaultsUtils, errors as vaultsErrors } from '../../vaults';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function vaultsGitPackGet({ vaultManager }: { vaultManager: VaultManager }) {
  return async (
    call: grpc.ServerDuplexStream<vaultsPB.PackChunk, vaultsPB.PackChunk>,
  ) => {
    const genDuplex = grpcUtils.generatorDuplex(call);
    const clientBodyBuffers: Uint8Array[] = [];
    const clientRequest = (await genDuplex.read()).value;
    clientBodyBuffers.push(clientRequest!.getChunk_asU8());
    const body = Buffer.concat(clientBodyBuffers);
    const meta = call.metadata;
    const vaultNameOrId = meta.get('vaultNameOrId').pop()!.toString();
    if (vaultNameOrId == null) {
      throw new grpcErrors.ErrorGRPC('vault-name not in metadata');
    }
    let vaultId = await vaultManager.getVaultId(vaultNameOrId as VaultName);
    vaultId = vaultId ?? vaultsUtils.decodeVaultId(vaultNameOrId);
    if (vaultId == null) {
      await genDuplex.throw(new vaultsErrors.ErrorVaultsVaultUndefined());
      return;
    }
    const response = new vaultsPB.PackChunk();
    const [sideBand, progressStream] = await vaultManager.handlePackRequest(
      vaultId,
      Buffer.from(body),
    );
    response.setChunk(Buffer.from('0008NAK\n'));
    await genDuplex.write(response);
    const responseBuffers: Uint8Array[] = [];
    await new Promise<void>((resolve, reject) => {
      sideBand.on('data', async (data: Uint8Array) => {
        responseBuffers.push(data);
      });
      sideBand.on('end', async () => {
        response.setChunk(Buffer.concat(responseBuffers));
        await genDuplex.write(response);
        resolve();
      });
      sideBand.on('error', (err) => {
        reject(err);
      });
      progressStream.write(Buffer.from('0014progress is at 50%\n'));
      progressStream.end();
    });
    await genDuplex.next(null);
  };
}

export default vaultsGitPackGet;
