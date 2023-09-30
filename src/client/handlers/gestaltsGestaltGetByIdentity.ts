import type { DB } from '@matrixai/db';
import type { GestaltMessage, IdentityMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { IdentityId, ProviderId } from '../../ids/index';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import * as nodesUtils from '../../nodes/utils';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

class GestaltsGestaltGetByIdentityHandler extends UnaryHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
  },
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<GestaltMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<IdentityMessage>,
  ): Promise<ClientRPCResponseResult<GestaltMessage>> {
    const { db, gestaltGraph } = this.container;
    const {
      providerId,
      identityId,
    }: { providerId: ProviderId; identityId: IdentityId } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['providerId'], () => validationUtils.parseProviderId(value)],
          [['identityId'], () => validationUtils.parseIdentityId(value)],
          () => value,
        );
      },
      {
        providerId: input.providerId,
        identityId: input.identityId,
      },
    );
    const gestalt = await db.withTransactionF((tran) =>
      gestaltGraph.getGestaltByIdentity([providerId, identityId], tran),
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

export { GestaltsGestaltGetByIdentityHandler };
