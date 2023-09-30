import type { DB } from '@matrixai/db';
import type { ActionsListMessage, NodeIdMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { GestaltAction } from '../../gestalts/types';
import type { NodeId } from '../../ids/index';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

class GestaltsActionsGetByNodeHandler extends UnaryHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<ActionsListMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult<ActionsListMessage>> {
    const { db, gestaltGraph } = this.container;
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
    const result = await db.withTransactionF((tran) =>
      gestaltGraph.getGestaltActions(['node', nodeId], tran),
    );

    return {
      actionsList: Object.keys(result) as Array<GestaltAction>,
    };
  }
}

export { GestaltsActionsGetByNodeHandler };
