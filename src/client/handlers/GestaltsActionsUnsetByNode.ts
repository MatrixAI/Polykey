import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SetNodeActionMessage,
} from '../types.js';
import type { GestaltAction } from '../../gestalts/types.js';
import type GestaltGraph from '../../gestalts/GestaltGraph.js';
import type { NodeId } from '../../ids/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids/index.js';
import * as gestaltsUtils from '../../gestalts/utils.js';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';

class GestaltsActionsUnsetByNode extends UnaryHandler<
  {
    db: DB;
    gestaltGraph: GestaltGraph;
  },
  ClientRPCRequestParams<SetNodeActionMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<SetNodeActionMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const { db, gestaltGraph }: { db: DB; gestaltGraph: GestaltGraph } =
      this.container;
    const { nodeId, action }: { nodeId: NodeId; action: GestaltAction } =
      validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['nodeId'], () => ids.parseNodeId(value)],
            [['action'], () => gestaltsUtils.parseGestaltAction(value)],
            () => value,
          );
        },
        {
          nodeId: input.nodeIdEncoded,
          action: input.action,
        },
      );
    await db.withTransactionF((tran) =>
      gestaltGraph.unsetGestaltAction(['node', nodeId], action, tran),
    );
    return {};
  };
}

export default GestaltsActionsUnsetByNode;
