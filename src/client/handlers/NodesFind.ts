import type {
  AddressMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
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
  ClientRPCResponseResult<AddressMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult<AddressMessage>> => {
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
    const address = await nodeConnectionManager.findNode(nodeId);
    if (address == null) throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();

    return {
      host: address.host,
      port: address.port,
    };
  };
}

export default NodesFind;
