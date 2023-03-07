import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { DB } from '@matrixai/db';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { GestaltMessage } from 'client/handlers/types';
import * as nodesUtils from '../../nodes/utils';
import { ServerCaller } from '../../RPC/callers';
import { ServerHandler } from '../../RPC/handlers';

const gestaltsGestaltList = new ServerCaller<
  RPCRequestParams,
  RPCResponseResult<GestaltMessage>
>();

class GestaltsGestaltListHandler extends ServerHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
  },
  RPCRequestParams,
  RPCResponseResult<GestaltMessage>
> {
  public async *handle(): AsyncGenerator<RPCResponseResult<GestaltMessage>> {
    const { db, gestaltGraph } = this.container;
    yield* db.withTransactionG(async function* (
      tran,
    ): AsyncGenerator<RPCResponseResult<GestaltMessage>> {
      for await (const gestalt of gestaltGraph.getGestalts(tran)) {
        const gestaltMessage: GestaltMessage = {
          gestalt: {
            matrix: {},
            nodes: {},
            identities: {},
          },
        };
        // Mutating the object directly
        const newGestalt = gestaltMessage.gestalt;
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
        yield gestaltMessage;
      }
    });
  }
}

export { gestaltsGestaltList, GestaltsGestaltListHandler };
