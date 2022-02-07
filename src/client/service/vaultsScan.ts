import type { Authenticate } from '../types';
import type { VaultManager } from '../../vaults';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '../../grpc';
import { utils as vaultsUtils } from '../../vaults';
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
      const vaults = await vaultManager.listVaults();
      vaults.forEach(async (vaultId, vaultName) => {
        const vaultListMessage = new vaultsPB.List();
        vaultListMessage.setVaultName(vaultName);
        vaultListMessage.setVaultId(vaultsUtils.makeVaultIdPretty(vaultId));
        await genWritable.next(vaultListMessage);
      });
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      return;
    }
  };
}

export default vaultsScan;
