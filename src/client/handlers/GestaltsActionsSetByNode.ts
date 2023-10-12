import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SetNodeActionMessage,
} from '../types';
import type { GestaltAction } from '../../gestalts/types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { NodeId } from '../../ids/index';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

class GestaltsActionsSetByNode extends UnaryHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
  },
  ClientRPCRequestParams<SetNodeActionMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<SetNodeActionMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const { db, gestaltGraph } = this.container;
    const { nodeId, action }: { nodeId: NodeId; action: GestaltAction } =
      validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['nodeId'], () => validationUtils.parseNodeId(value)],
            [['action'], () => validationUtils.parseGestaltAction(value)],
            () => value,
          );
        },
        {
          nodeId: input.nodeIdEncoded,
          action: input.action,
        },
      );
    await db.withTransactionF((tran) =>
      gestaltGraph.setGestaltAction(['node', nodeId], action, tran),
    );
    return {};
  };
}

export default GestaltsActionsSetByNode;
