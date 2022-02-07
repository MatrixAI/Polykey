import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NodeManager } from '../../nodes';
import type { NodeId, NodeAddress } from '../../nodes/types';
import type { Host, Hostname, Port } from '../../network/types';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import { utils as grpcUtils } from '../../grpc';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
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
    try {
      const response = new utilsPB.EmptyMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        nodeId,
        host,
        port,
      }: {
        nodeId: NodeId;
        host: Host | Hostname;
        port: Port;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['nodeId'], () => validationUtils.parseNodeId(value)],
            [['host'], () => validationUtils.parseHostOrHostname(value)],
            [['port'], () => validationUtils.parsePort(value)],
            () => value,
          );
        },
        {
          nodeId: call.request.getNodeId(),
          host: call.request.getAddress()?.getHost(),
          port: call.request.getAddress()?.getPort(),
        },
      );
      await nodeManager.setNode(nodeId, {
        host,
        port,
      } as NodeAddress);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default nodesAdd;
