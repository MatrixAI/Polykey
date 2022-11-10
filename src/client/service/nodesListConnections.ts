import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import * as grpcUtils from '../../grpc/utils';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as clientUtils from '../utils';
import * as nodesUtils from '../../nodes/utils';

function nodesListConnections({
  authenticate,
  nodeConnectionManager,
  logger,
}: {
  authenticate: Authenticate;
  nodeConnectionManager: NodeConnectionManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerWritableStream<
      utilsPB.EmptyMessage,
      nodesPB.NodeConnection
    >,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const connections = nodeConnectionManager.listConnections();
      for (const connection of connections) {
        const connectionMessage = new nodesPB.NodeConnection();
        connectionMessage.setNodeId(nodesUtils.encodeNodeId(connection.nodeId));
        connectionMessage.setHost(connection.address.host);
        connectionMessage.setHostname(connection.address.hostname ?? '');
        connectionMessage.setPort(connection.address.port);
        connectionMessage.setUsageCount(connection.usageCount);
        connectionMessage.setTimeout(connection.timeout ?? -1);
        await genWritable.next(connectionMessage);
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      !clientUtils.isClientClientError(e) &&
        logger.error(`${nodesListConnections.name}:${e}`);
      return;
    }
  };
}

export default nodesListConnections;
