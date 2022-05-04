import type { Authenticate } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type * as grpc from '@grpc/grpc-js';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function vaultsList({
  authenticate,
  vaultManager,
  logger,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerWritableStream<utilsPB.EmptyMessage, vaultsPB.List>,
  ): Promise<void> => {
    // Call.on('error', (e) => console.error(e));
    // call.on('close', () => console.log('Got close'));
    // call.on('finish', () => console.log('Got finish'));
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const vaults = await vaultManager.listVaults();
      for await (const [vaultName, vaultId] of vaults) {
        const vaultListMessage = new vaultsPB.List();
        vaultListMessage.setVaultName(vaultName);
        vaultListMessage.setVaultId(vaultsUtils.encodeVaultId(vaultId));
        await genWritable.next(((_) => vaultListMessage)());
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      logger.error(e);
      return;
    }
  };
}

export default vaultsList;
