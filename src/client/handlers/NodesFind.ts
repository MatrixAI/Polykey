import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
  NodesFindMessage,
} from '../types';
import type { NodeId } from '../../ids';
import type NodeManager from '../../nodes/NodeManager';
import type { ContextTimed } from '@matrixai/contexts';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import * as nodesErrors from '../../nodes/errors';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

class NodesFind extends UnaryHandler<
  {
    nodeManager: NodeManager;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<NodesFindMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<NodeIdMessage>,
    _cancel,
    _meta,
    ctx: ContextTimed,
  ): Promise<ClientRPCResponseResult<NodesFindMessage>> => {
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
    const result = await nodeManager.findNode(
      {
        nodeId: nodeId,
      },
      ctx,
    );
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
