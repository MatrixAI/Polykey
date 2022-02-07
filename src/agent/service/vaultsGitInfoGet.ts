import type { VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import type { ACL } from '../../acl';
import * as grpc from '@grpc/grpc-js';
import { utils as idUtils } from '@matrixai/id';
import { utils as grpcUtils } from '../../grpc';
import { utils as vaultsUtils, errors as vaultsErrors } from '../../vaults';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as validationUtils from '../../validation/utils';

function vaultsGitInfoGet({
  vaultManager,
  acl,
}: {
  vaultManager: VaultManager;
  acl: ACL;
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
    const nodeMessage = request.getNode();
    if (nodeMessage == null) {
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
        vaultName = (await vaultManager.getVaultMeta(vaultId)).name;
      } catch (err) {
        await genWritable.throw(new vaultsErrors.ErrorVaultsVaultUndefined());
        return;
      }
    }
    const nodeId = validationUtils.parseNodeId(nodeMessage.getNodeId());
    const actionType = request.getAction();
    const perms = await acl.getNodePerm(nodeId);
    if (!perms) {
      await genWritable.throw(new vaultsErrors.ErrorVaultsPermissionDenied());
      return;
    }
    const vaultPerms = perms.vaults[idUtils.toString(vaultId)];
    try {
      if (vaultPerms[actionType] !== null) {
        await genWritable.throw(new vaultsErrors.ErrorVaultsPermissionDenied());
        return;
      }
    } catch (err) {
      if (err instanceof TypeError) {
        await genWritable.throw(new vaultsErrors.ErrorVaultsPermissionDenied());
        return;
      }
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
