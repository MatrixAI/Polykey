import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { NodeId } from '../../ids';
import type { NodeIdMessage, SuccessMessage } from '../handlers/types';
import type NodeManager from '../../nodes/NodeManager';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';

class NodesPingHandler extends UnaryHandler<
  {
    nodeManager: NodeManager;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> {
    const { nodeManager } = this.container;
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
    const success = await nodeManager.pingNode(nodeId);
    return {
      success,
    };
  }
}

export { NodesPingHandler };
