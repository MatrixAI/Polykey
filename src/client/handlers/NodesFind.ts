import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
  NodesFindMessage,
} from '../types';
import type { NodeId } from '../../ids';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import * as nodesErrors from '../../nodes/errors';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

class NodesFind extends UnaryHandler<
  {
    nodeConnectionManager: NodeConnectionManager;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<NodesFindMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult<NodesFindMessage>> => {
    const { nodeConnectionManager } = this.container;

    const {
      nodeId,
    }: {
      nodeId: NodeId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['nodeId'], () => ids.parseNodeId(value)],
          () => value,
        );
      },
      {
        nodeId: input.nodeIdEncoded,
      },
    );
    const addresses = await nodeConnectionManager.findNodeAll(nodeId);
    if (addresses.length === 0) {
      throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();
    }

    return { addresses };
  };
}

export default NodesFind;
