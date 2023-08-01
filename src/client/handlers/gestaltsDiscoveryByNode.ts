import type { NodeIdMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { NodeId } from '../../ids/index';
import type Discovery from '../../discovery/Discovery';
import { UnaryHandler } from '../../rpc/handlers';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

class GestaltsDiscoveryByNodeHandler extends UnaryHandler<
  {
    discovery: Discovery;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult
> {
  public async handle(
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult> {
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
  }
}

export { GestaltsDiscoveryByNodeHandler };
