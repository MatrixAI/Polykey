import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { Discovery } from '../../discovery';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import { utils as grpcUtils } from '../../grpc';
import { utils as nodesUtils } from '../../nodes';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function gestaltsDiscoveryByNode({
  authenticate,
  discovery,
}: {
  authenticate: Authenticate;
  discovery: Discovery;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const info = call.request;
    const response = new utilsPB.EmptyMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Constructing identity info.
      const gen = discovery.discoverGestaltByNode(
        nodesUtils.makeNodeId(info.getNodeId()),
      );
      for await (const _ of gen) {
        // Empty
      }
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default gestaltsDiscoveryByNode;
