import type * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '../../grpc';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';

function vaultsScan(_) {
  return async (
    call: grpc.ServerWritableStream<nodesPB.Node, vaultsPB.Vault>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    // Const response = new vaultsPB.Vault();
    // const id = makeNodeId(call.request.getNodeId());
    try {
      throw Error('Not implemented');
      // FIXME: handleVaultNamesRequest doesn't exist.
      // const listResponse = vaultManager.handleVaultNamesRequest(id);
      // let listResponse;
      // for await (const vault of listResponse) {
      //   if (vault !== null) {
      //     response.setNameOrId(vault);
      //     await genWritable.next(response);
      //   } else {
      //     await genWritable.next(null);
      //   }
      // }
      // await genWritable.next(null);
    } catch (err) {
      await genWritable.throw(err);
    }
  };
}

export default vaultsScan;
