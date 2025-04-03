import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
} from '../types.js';
import type { NodeId } from '../../ids/index.js';
import type Discovery from '../../discovery/Discovery.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids/index.js';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';

class GestaltsDiscoveryByNode extends UnaryHandler<
  {
    discovery: Discovery;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const { discovery }: { discovery: Discovery } = this.container;
    const { nodeId }: { nodeId: NodeId } = validateSync(
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

    await discovery.queueDiscoveryByNode(nodeId, Date.now());

    return {};
  };
}

export default GestaltsDiscoveryByNode;
