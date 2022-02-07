import type * as grpc from '@grpc/grpc-js';
import type { GestaltGraph } from '../../gestalts';
import type { VaultManager } from '../../vaults';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as validationUtils from '@/validation/utils';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import { utils as vaultsUtils, errors as vaultsErrors } from '../../vaults';
import { utils as grpcUtils } from '../../grpc';

function vaultsScan({
  vaultManager,
  gestaltGraph,
}: {
  vaultManager: VaultManager;
  gestaltGraph: GestaltGraph;
}) {
  return async (
    call: grpc.ServerWritableStream<nodesPB.Node, vaultsPB.List>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    const response = new vaultsPB.List();
    const nodeId = validationUtils.parseNodeId(call.request.getNodeId());
    const perms = await gestaltGraph.getGestaltActionsByNode(nodeId);
    if (!perms) {
      await genWritable.throw(new vaultsErrors.ErrorVaultsPermissionDenied());
      return;
    }
    try {
      if (perms['scan'] !== null) {
        await genWritable.throw(new vaultsErrors.ErrorVaultsPermissionDenied());
        return;
      }
    } catch (err) {
      if (err instanceof TypeError) {
        await genWritable.throw(new vaultsErrors.ErrorVaultsPermissionDenied());
        return;
      }
      throw err;
    }
    try {
      const listResponse = await vaultManager.listVaults();
      for (const vault of listResponse) {
        if (vault !== null) {
          response.setVaultName(vault[0]);
          response.setVaultId(vaultsUtils.encodeVaultId(vault[1]));
          await genWritable.next(response);
        } else {
          await genWritable.next(null);
        }
      }
      await genWritable.next(null);
    } catch (err) {
      await genWritable.throw(err);
    }
  };
}

export default vaultsScan;
