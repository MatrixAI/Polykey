import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { AddressMessage, NodeIdMessage } from '../handlers/types';
import type { NodeId } from '../../ids';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import * as nodesErrors from '../../nodes/errors';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const nodesFind = new UnaryCaller<
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult<AddressMessage>
>();

class NodesFindHandler extends UnaryHandler<
  {
    nodeConnectionManager: NodeConnectionManager;
  },
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult<AddressMessage>
> {
  public async handle(
    input: RPCRequestParams<NodeIdMessage>,
  ): Promise<RPCResponseResult<AddressMessage>> {
    const { nodeConnectionManager } = this.container;

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
    const address = await nodeConnectionManager.findNode(nodeId);
    if (address == null) throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();

    return {
      host: address.host,
      port: address.port,
    };
  }
}

export { nodesFind, NodesFindHandler };
