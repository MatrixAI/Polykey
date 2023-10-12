import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
  SuccessMessage,
} from '../types';
import type { NodeId } from '../../ids';
import type NodeManager from '../../nodes/NodeManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

class NodesPing extends UnaryHandler<
  {
    nodeManager: NodeManager;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const { nodeManager } = this.container;
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
    const success = await nodeManager.pingNode(nodeId);
    return {
      success,
    };
  };
}

export default NodesPing;
