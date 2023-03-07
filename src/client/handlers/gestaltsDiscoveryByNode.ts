import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { NodeId } from 'ids/index';
import type Discovery from '../../discovery/Discovery';
import type { NodeIdMessage } from 'client/handlers/types';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const gestaltsDiscoveryByNode = new UnaryCaller<
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult
>();

class GestaltsDiscoveryByNodeHandler extends UnaryHandler<
  {
    discovery: Discovery;
  },
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult
> {
  public async handle(
    input: RPCRequestParams<NodeIdMessage>,
  ): Promise<RPCResponseResult> {
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

export { gestaltsDiscoveryByNode, GestaltsDiscoveryByNodeHandler };
