import type { JSONValue } from '@matrixai/rpc';
import type { ContextTimed } from '@matrixai/contexts';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
  NodesFindMessage,
} from '../types.js';
import type { NodeId } from '../../ids/index.js';
import type NodeManager from '../../nodes/NodeManager.js';
import type { AgentClientManifest } from '../../nodes/agent/callers/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';
import * as ids from '../../ids/index.js';
import * as nodesErrors from '../../nodes/errors.js';

class NodesFind extends UnaryHandler<
  {
    nodeManager: NodeManager<AgentClientManifest>;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<NodesFindMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<NodeIdMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): Promise<ClientRPCResponseResult<NodesFindMessage>> => {
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
    const result = await nodeManager.findNode({ nodeId: nodeId }, ctx);
    if (result == null) {
      throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();
    }
    const [nodeAddress, nodeContactAddressData] = result;
    return {
      nodeAddress,
      nodeContactAddressData,
    };
  };
}

export default NodesFind;
