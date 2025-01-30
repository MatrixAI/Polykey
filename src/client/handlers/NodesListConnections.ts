import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeConnectionMessage,
} from '../types';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@matrixai/rpc';
import { ServerHandler } from '@matrixai/rpc';
import * as nodesUtils from '../../nodes/utils';

class NodesListConnections extends ServerHandler<
  {
    nodeConnectionManager: NodeConnectionManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<NodeConnectionMessage>
> {
  public handle = async function* (
    _input: ClientRPCRequestParams,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<NodeConnectionMessage>> {
    const {
      nodeConnectionManager,
    }: {
      nodeConnectionManager: NodeConnectionManager;
    } = this.container;
    const connections = nodeConnectionManager.listConnections();
    for (const connection of connections) {
      ctx.signal.throwIfAborted();
      yield {
        host: connection.address.host,
        hostname: connection.address.hostname ?? '',
        nodeIdEncoded: nodesUtils.encodeNodeId(connection.nodeId),
        port: connection.address.port,
        timeout: connection.timeout ?? -1,
        usageCount: connection.usageCount,
      };
    }
  };
}

export default NodesListConnections;
