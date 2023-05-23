import type { NodeAddressMessage, NodeIdMessage } from './types';
import type { NodeGraph } from '../../nodes';
import type { DB } from '@matrixai/db';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import type { NodeId } from '../../ids';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import * as nodesUtils from '../../nodes/utils';
import { ServerHandler } from '../../rpc/handlers';

class NodesClosestLocalNodesGetHandler extends ServerHandler<
  {
    nodeGraph: NodeGraph;
    db: DB;
  },
  AgentRPCRequestParams<NodeIdMessage>,
  AgentRPCResponseResult<NodeAddressMessage>
> {
  public async *handle(
    input: AgentRPCRequestParams<NodeIdMessage>,
  ): AsyncGenerator<AgentRPCResponseResult<NodeAddressMessage>> {
    const { nodeGraph, db } = this.container;

    const {
      nodeId,
    }: {
      nodeId: NodeId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['nodeId'], () => validationUtils.parseNodeId(value)],
          () => value,
        );
      },
      {
        nodeId: input.nodeIdEncoded,
      },
    );
    // Get all local nodes that are closest to the target node from the request
    return yield* db.withTransactionG(async function* (
      tran,
    ): AsyncGenerator<AgentRPCResponseResult<NodeAddressMessage>> {
      const closestNodes = await nodeGraph.getClosestNodes(
        nodeId,
        undefined,
        tran,
      );
      for (const [nodeId, nodeData] of closestNodes) {
        yield {
          nodeIdEncoded: nodesUtils.encodeNodeId(nodeId),
          host: nodeData.address.host,
          port: nodeData.address.port,
        };
      }
    });
  }
}

export { NodesClosestLocalNodesGetHandler };
