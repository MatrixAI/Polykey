import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@matrixai/rpc';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  NodeIdMessage,
} from '../types';
import type NodeConnectionManager from '../../NodeConnectionManager';
import type { NodeId } from '../../../ids';
import type { ActiveConnectionDataMessage } from '../types';
import { ServerHandler } from '@matrixai/rpc';
import * as utils from '../../../utils';
import * as ids from '../../../ids';
import * as validation from '../../../validation';
import * as nodesUtils from '../../utils';

/**
 * Gets the closest local nodes to a target node
 */
class NodesClosestActiveConnectionsGet extends ServerHandler<
  {
    nodeConnectionManager: NodeConnectionManager;
  },
  AgentRPCRequestParams<NodeIdMessage>,
  AgentRPCResponseResult<ActiveConnectionDataMessage>
> {
  public handle = async function* (
    input: AgentRPCRequestParams<NodeIdMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): AsyncGenerator<AgentRPCResponseResult<ActiveConnectionDataMessage>> {
    const {
      nodeConnectionManager,
    }: {
      nodeConnectionManager: NodeConnectionManager;
    } = this.container;

    const {
      nodeId,
    }: {
      nodeId: NodeId;
    } = validation.validateSync(
      (keyPath, value) => {
        return utils.matchSync(keyPath)(
          [['nodeId'], () => ids.parseNodeId(value)],
          () => value,
        );
      },
      {
        nodeId: input.nodeIdEncoded,
      },
    );

    const nodes = nodeConnectionManager.getClosestConnections(nodeId);
    for (const nodeInfo of nodes) {
      ctx.signal.throwIfAborted();
      yield {
        nodeId: nodesUtils.encodeNodeId(nodeInfo.nodeId),
        connections: nodeInfo.connections,
      };
    }
  };
}

export default NodesClosestActiveConnectionsGet;
