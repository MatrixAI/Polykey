import type { VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import type { ACL } from '../../acl';
import type { ConnectionInfoGet } from '../../agent/types';
import * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '../../grpc';
import { utils as vaultsUtils, errors as vaultsErrors } from '../../vaults';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as validationUtils from '../../validation/utils';
import * as nodesUtils from '../../nodes/utils';
import * as agentErrors from '../errors';

function vaultsGitInfoGet({
  vaultManager,
  acl,
  connectionInfoGet,
}: {
  vaultManager: VaultManager;
  acl: ACL;
  connectionInfoGet: ConnectionInfoGet;
}) {
  return async (
    call: grpc.ServerWritableStream<vaultsPB.InfoRequest, vaultsPB.PackChunk>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    const request = call.request;
    const vaultMessage = request.getVault();
    if (vaultMessage == null) {
      await genWritable.throw({ code: grpc.status.NOT_FOUND });
      return;
    }
    let vaultName;
    const vaultNameOrId = vaultMessage.getNameOrId();
    let vaultId = await vaultManager.getVaultId(vaultNameOrId as VaultName);
    vaultName = vaultNameOrId;
    if (!vaultId) {
      try {
        vaultId = validationUtils.parseVaultId(vaultNameOrId);
        vaultName = (await vaultManager.getVaultMeta(vaultId))?.vaultName;
      } catch (err) {
        await genWritable.throw(new vaultsErrors.ErrorVaultsVaultUndefined());
        return;
      }
    }
    // Getting the NodeId from the ReverseProxy connection info
    const connectionInfo = connectionInfoGet(call);
    // If this is getting run the connection exists
    // It SHOULD exist here
    if (connectionInfo == null) {
      throw new agentErrors.ErrorConnectionInfoMissing();
    }
    const nodeId = connectionInfo.nodeId;
    const nodeIdEncoded = nodesUtils.encodeNodeId(nodeId);
    const actionType = validationUtils.parseVaultAction(request.getAction());
    const permissions = await acl.getNodePerm(nodeId);
    if (permissions == null) {
      await genWritable.throw(
        new vaultsErrors.ErrorVaultsPermissionDenied(
          `No permissions found for ${nodeIdEncoded}`,
        ),
      );
      return;
    }
    const vaultPerms = permissions.vaults[vaultId];
    if (vaultPerms[actionType] !== null) {
      await genWritable.throw(
        new vaultsErrors.ErrorVaultsPermissionDenied(
          `${nodeIdEncoded} does not have permission to ${actionType} from vault ${vaultsUtils.encodeVaultId(
            vaultId,
          )}`,
        ),
      );
      return;
    }
    const meta = new grpc.Metadata();
    meta.set('vaultName', vaultName);
    meta.set('vaultId', vaultsUtils.encodeVaultId(vaultId));
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
