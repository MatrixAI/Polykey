import type { Authenticate } from '../types';
import type { NodeId } from '../../nodes/types';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type * as grpc from '@grpc/grpc-js';
import type { VaultManager } from '../../vaults';
import { utils as grpcUtils } from '../../grpc';
import { utils as vaultsUtils } from '../../vaults';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function vaultsScan({
  vaultManager,
  authenticate,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerWritableStream<nodesPB.Node, vaultsPB.List>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        nodeId,
      }: {
        nodeId: NodeId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['nodeId'], () => validationUtils.parseNodeId(value)],
            () => value,
          );
        },
        {
          nodeId: call.request.getNodeId(),
        },
      );
      const list = await vaultManager.scanNodeVaults(nodeId);
      for (const vault of list) {
        const vaultListMessage = new vaultsPB.List();
        vaultListMessage.setVaultName(vault[0]);
        vaultListMessage.setVaultId(vaultsUtils.encodeVaultId(vault[1]));
        await genWritable.next(vaultListMessage);
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      return;
    }
  };
}

export default vaultsScan;
