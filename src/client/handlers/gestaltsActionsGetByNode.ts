import type { RPCRequestParams, RPCResponseResult } from '../types';
import type GestaltGraph from 'gestalts/GestaltGraph';
import type { DB } from '@matrixai/db';
import type { GestaltAction } from 'gestalts/types';
import type { NodeId } from 'ids/index';
import type { ActionsListMessage, NodeIdMessage } from 'client/handlers/types';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const gestaltsActionsGetByNode = new UnaryCaller<
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult<ActionsListMessage>
>();

class GestaltsActionsGetByNodeHandler extends UnaryHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
  },
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult<ActionsListMessage>
> {
  public async handle(
    input: RPCRequestParams<NodeIdMessage>,
  ): Promise<RPCResponseResult<ActionsListMessage>> {
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

export { gestaltsActionsGetByNode, GestaltsActionsGetByNodeHandler };