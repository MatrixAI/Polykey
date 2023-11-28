import type { DB } from '@matrixai/db';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  NodeAddressMessage,
  NodeContactMessage,
  NodeIdMessage,
} from '../types';
import type NodeGraph from '../../NodeGraph';
import type { NodeId } from '../../../ids';
import { ServerHandler } from '@matrixai/rpc';
import * as ids from '../../../ids';
import * as validation from '../../../validation';
import * as nodesUtils from '../../utils';
import * as utils from '../../../utils';

/**
 * Gets the closest local nodes to a target node
 */
class NodesClosestLocalNodesGet extends ServerHandler<
  {
    nodeGraph: NodeGraph;
    db: DB;
  },
  AgentRPCRequestParams<NodeIdMessage>,
  AgentRPCResponseResult<NodeContactMessage>
> {
  public handle = async function* (
    input: AgentRPCRequestParams<NodeIdMessage>,
  ): AsyncGenerator<AgentRPCResponseResult<NodeContactMessage>> {
    const { nodeGraph, db } = this.container;

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
    // Get all local nodes that are closest to the target node from the request
    return yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      AgentRPCResponseResult<NodeAddressMessage>
    > {
      const closestNodes = await nodeGraph.getClosestNodes(
        nodeId,
        undefined,
        tran,
      );
      for (const [nodeId, nodeContact] of closestNodes) {
        yield {
          nodeIdEncoded: nodesUtils.encodeNodeId(nodeId),
          nodeContact,
        };
      }
    });
  };
}

export default NodesClosestLocalNodesGet;
