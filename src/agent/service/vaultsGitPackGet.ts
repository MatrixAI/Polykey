import type * as grpc from '@grpc/grpc-js';
import type { VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import { promisify } from '../../utils';
import { errors as grpcErrors } from '../../grpc';
import { utils as vaultsUtils, errors as vaultsErrors } from '../../vaults';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function vaultsGitPackGet({ vaultManager }: { vaultManager: VaultManager }) {
  return async (
    call: grpc.ServerDuplexStream<vaultsPB.PackChunk, vaultsPB.PackChunk>,
  ) => {
    const write = promisify(call.write).bind(call);
    const clientBodyBuffers: Buffer[] = [];
    call.on('data', (d) => {
      clientBodyBuffers.push(d.getChunk_asU8());
    });

    call.on('end', async () => {
      const body = Buffer.concat(clientBodyBuffers);
      const meta = call.metadata;
      const vaultNameOrId = meta.get('vaultNameOrId').pop()!.toString();
      if (vaultNameOrId == null)
        throw new grpcErrors.ErrorGRPC('vault-name not in metadata.');
      let vaultId;
      try {
        vaultId = vaultsUtils.makeVaultId(vaultNameOrId);
        await vaultManager.openVault(vaultId);
      } catch (err) {
        if (
          err instanceof vaultsErrors.ErrorVaultUndefined ||
          err instanceof SyntaxError
        ) {
          vaultId = await vaultManager.getVaultId(vaultNameOrId as VaultName);
          await vaultManager.openVault(vaultId);
        } else {
          throw err;
        }
      }
      // TODO: Check the permissions here
      const response = new vaultsPB.PackChunk();
      const [sideBand, progressStream] = await vaultManager.handlePackRequest(
        vaultId,
        Buffer.from(body),
      );
      response.setChunk(Buffer.from('0008NAK\n'));
      await write(response);
      const responseBuffers: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        sideBand.on('data', async (data: Buffer) => {
          responseBuffers.push(data);
        });
        sideBand.on('end', async () => {
          response.setChunk(Buffer.concat(responseBuffers));
          await write(response);
          resolve();
        });
        sideBand.on('error', (err) => {
          reject(err);
        });
        progressStream.write(Buffer.from('0014progress is at 50%\n'));
        progressStream.end();
      });
      call.end();
    });
  };
}

export default vaultsGitPackGet;
