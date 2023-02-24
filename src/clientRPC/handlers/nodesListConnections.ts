import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { NodeConnectionMessage } from '../../clientRPC/handlers/types';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import * as nodesUtils from '../../nodes/utils';
import { ServerCaller } from '../../RPC/callers';
import { ServerHandler } from '../../RPC/handlers';

const nodesListConnections = new ServerCaller<
  RPCRequestParams,
  RPCResponseResult<NodeConnectionMessage>
>();

class NodesListConnectionsHandler extends ServerHandler<
  {
    nodeConnectionManager: NodeConnectionManager;
  },
  RPCRequestParams,
  RPCResponseResult<NodeConnectionMessage>
> {
  public async *handle(): AsyncGenerator<
    RPCResponseResult<NodeConnectionMessage>
  > {
    const { nodeConnectionManager } = this.container;
    const connections = nodeConnectionManager.listConnections();
    for (const connection of connections) {
      yield {
        host: connection.address.host,
        hostname: connection.address.hostname ?? '',
        nodeIdEncoded: nodesUtils.encodeNodeId(connection.nodeId),
        port: connection.address.port,
        timeout: connection.timeout ?? -1,
        usageCount: connection.usageCount,
      };
    }
  }
}

export { nodesListConnections, NodesListConnectionsHandler };
