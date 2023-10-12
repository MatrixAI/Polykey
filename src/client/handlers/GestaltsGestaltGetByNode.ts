import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  GestaltMessage,
  NodeIdMessage,
} from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { NodeId } from '../../ids';
import { UnaryHandler } from '@matrixai/rpc';
import * as nodesUtils from '../../nodes/utils';
import * as ids from '../../ids';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

class GestaltsGestaltGetByNode extends UnaryHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
  },
  ClientRPCRequestParams<NodeIdMessage>,
  ClientRPCResponseResult<GestaltMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<NodeIdMessage>,
  ): Promise<ClientRPCResponseResult<GestaltMessage>> => {
    const { db, gestaltGraph } = this.container;
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
  };
}

export default GestaltsGestaltGetByNode;
