import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { NodeConnectionMessage } from '../handlers/types';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import * as nodesUtils from '../../nodes/utils';
import { ServerCaller } from '../../rpc/callers';
import { ServerHandler } from '../../rpc/handlers';

const nodesListConnections = new ServerCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<NodeConnectionMessage>
>();

class NodesListConnectionsHandler extends ServerHandler<
  {
    nodeConnectionManager: NodeConnectionManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<NodeConnectionMessage>
> {
  public async *handle(): AsyncGenerator<
    ClientRPCResponseResult<NodeConnectionMessage>
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
