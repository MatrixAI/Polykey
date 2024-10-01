import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
} from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { NodeId } from '../../ids';
import type Discovery from '../../discovery/Discovery';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

class GestaltsGestaltTrustByNode extends UnaryHandler<
  {
    db: DB;
    gestaltGraph: GestaltGraph;
    discovery: Discovery;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const {
      db,
      gestaltGraph,
      discovery,
    }: { db: DB; gestaltGraph: GestaltGraph; discovery: Discovery } =
      this.container;
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
  };
}

export default GestaltsGestaltTrustByNode;
