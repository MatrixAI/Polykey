import type { RPCRequestParams, RPCResponseResult } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { DB } from '@matrixai/db';
import type { NodeId } from 'ids/index';
import type { GestaltMessage, NodeIdMessage } from 'client/handlers/types';
import * as nodesUtils from '../../nodes/utils';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const gestaltsGestaltGetByNode = new UnaryCaller<
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult<GestaltMessage>
>();

class GestaltsGestaltGetByNodeHandler extends UnaryHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
  },
  RPCRequestParams<NodeIdMessage>,
  RPCResponseResult<GestaltMessage>
> {
  public async handle(
    input: RPCRequestParams<NodeIdMessage>,
  ): Promise<RPCResponseResult<GestaltMessage>> {
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
    const gestalt = await db.withTransactionF((tran) =>
      gestaltGraph.getGestaltByNode(nodeId, tran),
    );
    const gestaltMessage: GestaltMessage = {
      gestalt: {
        matrix: {},
        nodes: {},
        identities: {},
      },
    };
    // Mutating the object directly
    const newGestalt = gestaltMessage.gestalt;
    if (gestalt != null) {
      newGestalt.identities = gestalt.identities;
      for (const [key, value] of Object.entries(gestalt.nodes)) {
        newGestalt.nodes[key] = {
          nodeId: nodesUtils.encodeNodeId(value.nodeId),
        };
      }
      for (const keyA of Object.keys(gestalt.matrix)) {
        let record = newGestalt.matrix[keyA];
        if (record == null) {
          record = {};
          newGestalt.matrix[keyA] = record;
        }
        for (const keyB of Object.keys(gestalt.matrix[keyA])) {
          record[keyB] = null;
        }
      }
    }
    return gestaltMessage;
  }
}

export { gestaltsGestaltGetByNode, GestaltsGestaltGetByNodeHandler };
