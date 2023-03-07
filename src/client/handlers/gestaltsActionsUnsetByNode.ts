import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { DB } from '@matrixai/db';
import type { GestaltAction } from '../../gestalts/types';
import type GestaltGraph from 'gestalts/GestaltGraph';
import type { NodeId } from 'ids/index';
import type { SetNodeActionMessage } from 'client/handlers/types';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const gestaltsActionsUnsetByNode = new UnaryCaller<
  RPCRequestParams<SetNodeActionMessage>,
  RPCResponseResult
>();

class GestaltsActionsUnsetByNodeHandler extends UnaryHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
  },
  RPCRequestParams<SetNodeActionMessage>,
  RPCResponseResult
> {
  public async handle(
    input: RPCRequestParams<SetNodeActionMessage>,
  ): Promise<RPCResponseResult> {
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
      gestaltGraph.unsetGestaltAction(['node', nodeId], action, tran),
    );
    return {};
  }
}

export { gestaltsActionsUnsetByNode, GestaltsActionsUnsetByNodeHandler };
