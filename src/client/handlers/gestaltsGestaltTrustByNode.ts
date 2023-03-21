import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type GestaltGraph from 'gestalts/GestaltGraph';
import type { DB } from '@matrixai/db';
import type { NodeId } from 'ids/index';
import type Discovery from '../../discovery/Discovery';
import type { NodeIdMessage } from 'client/handlers/types';
import { UnaryCaller } from '../../rpc/callers';
import { UnaryHandler } from '../../rpc/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const gestaltsGestaltTrustByNode = new UnaryCaller<
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult
>();

class GestaltsGestaltTrustByNodeHandler extends UnaryHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
    discovery: Discovery;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult
> {
  public async handle(
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult> {
    const { db, gestaltGraph, discovery } = this.container;
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

    await db.withTransactionF(async (tran) => {
      // Set the node in the gestalt graph if not already
      if ((await gestaltGraph.getGestaltByNode(nodeId, tran)) == null) {
        await gestaltGraph.setNode(
          {
            nodeId,
          },
          tran,
        );
        // Queue the new node for discovery
        await discovery.queueDiscoveryByNode(nodeId);
      }
      // Set notify permission
      await gestaltGraph.setGestaltAction(['node', nodeId], 'notify', tran);
    });

    return {};
  }
}

export { gestaltsGestaltTrustByNode, GestaltsGestaltTrustByNodeHandler };
