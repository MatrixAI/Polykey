import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import { utils as grpcUtils } from '../../grpc';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function vaultsSecretsStat({ authenticate }: { authenticate: Authenticate }) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Vault, vaultsPB.Stat>,
    callback: grpc.sendUnaryData<vaultsPB.Stat>,
  ): Promise<void> => {
    try {
      const response = new vaultsPB.Stat();
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
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default vaultsSecretsStat;
