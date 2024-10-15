import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  GestaltMessage,
} from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import { ServerHandler } from '@matrixai/rpc';
import * as nodesUtils from '../../nodes/utils';

class GestaltsGestaltList extends ServerHandler<
  {
    db: DB;
    gestaltGraph: GestaltGraph;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<GestaltMessage>
> {
  public handle = async function* (
    _input,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<GestaltMessage>> {
    const { db, gestaltGraph }: { db: DB; gestaltGraph: GestaltGraph } =
      this.container;
    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      ClientRPCResponseResult<GestaltMessage>
    > {
      if (ctx.signal.aborted) throw ctx.signal.reason;
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
        if (ctx.signal.aborted) throw ctx.signal.reason;
        yield gestaltMessage;
      }
    });
  };
}

export default GestaltsGestaltList;
