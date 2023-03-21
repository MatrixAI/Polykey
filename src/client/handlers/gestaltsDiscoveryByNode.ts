import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { NodeId } from 'ids/index';
import type Discovery from '../../discovery/Discovery';
import type { NodeIdMessage } from 'client/handlers/types';
import { UnaryCaller } from '../../rpc/callers';
import { UnaryHandler } from '../../rpc/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const gestaltsDiscoveryByNode = new UnaryCaller<
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult
>();

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

export { gestaltsDiscoveryByNode, GestaltsDiscoveryByNodeHandler };
