import type { Authenticate } from '../types';
import type { Vault } from '../../vaults/types';
import * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '../../grpc';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function vaultsSecretsStat({
  authenticate,
}: {
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Vault, vaultsPB.Stat>,
    callback: grpc.sendUnaryData<vaultsPB.Stat>,
  ): Promise<void> => {
    const response = new vaultsPB.Stat();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);

      // Const vaultMessage = call.request;
      // Const id = await parseVaultInput(vaultMessage, vaultManager);
      // const vault = await vaultManager.openVault(id);
      // FIXME, reimplement this.
      throw Error('Not Implemented');
      // Const stats = await vaultManager.vaultStats(id);
      // response.setStats(JSON.stringify(stats)););
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default vaultsSecretsStat;
