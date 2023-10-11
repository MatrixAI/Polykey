import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
} from '../types';
import type { NodeId } from '../../ids/index';
import type Discovery from '../../discovery/Discovery';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

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
    const { discovery } = this.container;
    const { nodeId }: { nodeId: NodeId } = validateSync(
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

    await discovery.queueDiscoveryByNode(nodeId);

    return {};
  };
}

export default GestaltsDiscoveryByNode;
