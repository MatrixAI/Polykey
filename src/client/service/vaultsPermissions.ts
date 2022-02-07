import type { Authenticate } from '../types';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '../../grpc';

function vaultsPermissions({ authenticate }: { authenticate: Authenticate }) {
  return async (
    call: grpc.ServerWritableStream<vaultsPB.PermGet, vaultsPB.Permission>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);

    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);

      const nodeMessage = call.request.getNode();
      if (nodeMessage == null) {
        await genWritable.throw({ code: grpc.status.NOT_FOUND });
        return;
      }
      // Const node = nodeMessage.getNodeId();
      const vaultMessage = call.request.getVault();
      if (vaultMessage == null) {
        await genWritable.throw({ code: grpc.status.NOT_FOUND });
        return;
      }
      // Const id = await parseVaultInput(vaultMessage, vaultManager);
      // let perms: Record<NodeId, VaultAction>;
      throw Error('Not implemented');
      // FIXME
      // if (isNodeId(node)) {
      // Perms = await vaultManager.getVaultPermissions(id, node);
      // } else {
      // Perms = await vaultManager.getVaultPermissions(id);
      // }
      // const permissionMessage = new vaultsPB.Permission();
      // For (const nodeId in perms) {
      //   permissionMessage.setNodeId(nodeId);
      //   if (perms[nodeId]['pull'] !== undefined) {
      //     permissionMessage.setAction('pull');
      //   }
      //   await genWritable.next(permissionMessage);
      // }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      return;
    }
  };
}

export default vaultsPermissions;
