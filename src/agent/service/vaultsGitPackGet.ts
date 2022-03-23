import type * as grpc from '@grpc/grpc-js';
import type { VaultName } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type { ConnectionInfoGet } from '../../agent/types';
import type ACL from '../../acl/ACL';
import * as nodesUtils from '../../nodes/utils';
import * as grpcErrors from '../../grpc/errors';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as validationUtils from '../../validation/utils';
import * as agentErrors from '../errors';

function vaultsGitPackGet({
  vaultManager,
  acl,
  connectionInfoGet,
}: {
  vaultManager: VaultManager;
  acl: ACL;
  connectionInfoGet: ConnectionInfoGet;
}) {
  return async (
    call: grpc.ServerDuplexStream<vaultsPB.PackChunk, vaultsPB.PackChunk>,
  ) => {
    const genDuplex = grpcUtils.generatorDuplex(call);
    const clientBodyBuffers: Uint8Array[] = [];
    const clientRequest = (await genDuplex.read()).value;
    clientBodyBuffers.push(clientRequest!.getChunk_asU8());
    const body = Buffer.concat(clientBodyBuffers);
    const meta = call.metadata;
    // Getting the NodeId from the ReverseProxy connection info
    const connectionInfo = connectionInfoGet(call);
    // If this is getting run the connection exists
    // It SHOULD exist here
    if (connectionInfo == null) {
      throw new agentErrors.ErrorConnectionInfoMissing();
    }
    const nodeId = connectionInfo.remoteNodeId;
    const nodeIdEncoded = nodesUtils.encodeNodeId(nodeId);
    // Getting vaultId
    const vaultNameOrId = meta.get('vaultNameOrId').pop()!.toString();
    if (vaultNameOrId == null) {
      throw new grpcErrors.ErrorGRPC('vault-name not in metadata');
    }
    let vaultId = await vaultManager.getVaultId(vaultNameOrId as VaultName);
    vaultId = vaultId ?? vaultsUtils.decodeVaultId(vaultNameOrId);
    if (vaultId == null) {
      await genDuplex.throw(
        // Throwing permission error to hide information about vaults existence
        new vaultsErrors.ErrorVaultsPermissionDenied(
          `No permissions found for ${nodeIdEncoded}`,
        ),
      );
      return;
    }
    // Checking permissions
    const permissions = await acl.getNodePerm(nodeId);
    const vaultPerms = permissions?.vaults[vaultId];
    const actionType = validationUtils.parseVaultAction(
      meta.get('vaultAction').pop(),
    );
    if (vaultPerms?.[actionType] !== null) {
      await genDuplex.throw(
        new vaultsErrors.ErrorVaultsPermissionDenied(
          `${nodeIdEncoded} does not have permission to ${actionType} from vault ${vaultsUtils.encodeVaultId(
            vaultId,
          )}`,
        ),
      );
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
