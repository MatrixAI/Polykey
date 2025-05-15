import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
  SuccessMessage,
} from '../types.js';
import type { NodeId } from '../../ids/index.js';
import type NodeManager from '../../nodes/NodeManager.js';
import type { AgentClientManifest } from '../../nodes/agent/callers/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids/index.js';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';

class NodesPing extends UnaryHandler<
  {
    nodeManager: NodeManager<AgentClientManifest>;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const { nodeManager }: { nodeManager: NodeManager<AgentClientManifest> } =
      this.container;
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
    const result = await nodeManager.pingNode(nodeId);
    return { success: result != null };
  };
}

export default NodesPing;
