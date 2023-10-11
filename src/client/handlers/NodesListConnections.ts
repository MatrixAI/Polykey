import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeConnectionMessage,
} from '../types';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import { ServerHandler } from '@matrixai/rpc';
import * as nodesUtils from '../../nodes/utils';

class NodesListConnections extends ServerHandler<
  {
    nodeConnectionManager: NodeConnectionManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<NodeConnectionMessage>
> {
  public async *handle(
    _input,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<NodeConnectionMessage>> {
    const { nodeConnectionManager } = this.container;
    const connections = nodeConnectionManager.listConnections();
    for (const connection of connections) {
      if (ctx.signal.aborted) throw ctx.signal.reason;
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

export default NodesListConnections;
