import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NodeManager } from '../../nodes';
import type { NodeAddress } from '../../nodes/types';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import { utils as nodesUtils, errors as nodesErrors } from '../../nodes';
import { utils as grpcUtils } from '../../grpc';
import { utils as networkUtils } from '../../network';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

/**
 * Adds a node ID -> node address mapping into the buckets database.
 * This is an unrestricted add: no validity checks are made for the correctness
 * of the passed ID or host/port.
 */
function nodesAdd({
  nodeManager,
  authenticate,
}: {
  nodeManager: NodeManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.NodeAddress, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EmptyMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Validate the passed node ID and host
      const validNodeId = nodesUtils.isNodeId(call.request.getNodeId());
      if (!validNodeId) {
        throw new nodesErrors.ErrorInvalidNodeId();
      }
      const validHost = networkUtils.isValidHost(
        call.request.getAddress()!.getHost(),
      );
      if (!validHost) {
        throw new nodesErrors.ErrorInvalidHost();
      }
      await nodeManager.setNode(
        nodesUtils.makeNodeId(call.request.getNodeId()),
        {
          host: call.request.getAddress()!.getHost(),
          port: call.request.getAddress()!.getPort(),
        } as NodeAddress,
      );
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default nodesAdd;
