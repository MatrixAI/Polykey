import type { DB } from '@matrixai/db';
import type {
  ActionsListMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodeIdMessage,
} from '../types.js';
import type GestaltGraph from '../../gestalts/GestaltGraph.js';
import type { GestaltAction } from '../../gestalts/types.js';
import type { NodeId } from '../../ids/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids/index.js';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';

class GestaltsActionsGetByNode extends UnaryHandler<
  {
    db: DB;
    gestaltGraph: GestaltGraph;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<ActionsListMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult<ActionsListMessage>> => {
    const { db, gestaltGraph }: { db: DB; gestaltGraph: GestaltGraph } =
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
    const result = await db.withTransactionF((tran) =>
      gestaltGraph.getGestaltActions(['node', nodeId], tran),
    );

    return {
      actionsList: Object.keys(result) as Array<GestaltAction>,
    };
  };
}

export default GestaltsActionsGetByNode;
