import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { KeyManager } from '../../keys';
import type { NodeManager } from '../../nodes';
import type { GRPCServer } from '../../grpc';
import type { ForwardProxy, ReverseProxy } from '../../network';
import type { TLSConfig } from '../../network/types';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';

function keysKeyPairRenew({
  keyManager,
  nodeManager,
  fwdProxy,
  revProxy,
  grpcServerClient,
  authenticate,
}: {
  keyManager: KeyManager;
  nodeManager: NodeManager;
  fwdProxy: ForwardProxy;
  revProxy: ReverseProxy;
  grpcServerClient: GRPCServer;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<keysPB.Key, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EmptyMessage();
    try {
      // Lock the nodeManager - because we need to do a database refresh too
      await nodeManager.transaction(async (nodeManager) => {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        await keyManager.renewRootKeyPair(call.request.getName());
        // Reset the TLS config with new keypair + certificate
        const tlsConfig: TLSConfig = {
          keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
          certChainPem: await keyManager.getRootCertChainPem(),
        };
        fwdProxy.setTLSConfig(tlsConfig);
        revProxy.setTLSConfig(tlsConfig);
        grpcServerClient.setTLSConfig(tlsConfig);
        // Finally, refresh the node buckets
        await nodeManager.refreshBuckets();
      });
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default keysKeyPairRenew;
