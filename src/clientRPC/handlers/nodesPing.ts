import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { NodeId } from '../../ids';
import type {
  NodeIdMessage,
  SuccessMessage,
} from '../../clientRPC/handlers/types';
import type NodeManager from '../../nodes/NodeManager';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const nodesPing = new UnaryCaller<
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult<SuccessMessage>
>();

class NodesPingHandler extends UnaryHandler<
  {
    nodeManager: NodeManager;
  },
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: RPCRequestParams<NodeIdMessage>,
  ): Promise<RPCResponseResult<SuccessMessage>> {
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

export { nodesPing, NodesPingHandler };
