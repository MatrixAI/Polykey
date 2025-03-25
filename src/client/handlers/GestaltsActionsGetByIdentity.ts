import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  IdentityMessage,
} from '../types.js';
import type GestaltGraph from '../../gestalts/GestaltGraph.js';
import type { GestaltAction } from '../../gestalts/types.js';
import type { IdentityId, ProviderId } from '../../ids/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';
import * as ids from '../../ids/index.js';

class GestaltsActionsGetByIdentity extends UnaryHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
  },
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<{
    actionsList: Array<GestaltAction>;
  }>
> {
  public handle = async (
    input: ClientRPCRequestParams<IdentityMessage>,
  ): Promise<
    ClientRPCResponseResult<{
      actionsList: Array<GestaltAction>;
    }>
  > => {
    const { db, gestaltGraph }: { db: DB; gestaltGraph: GestaltGraph } =
      this.container;
    const {
      providerId,
      identityId,
    }: { providerId: ProviderId; identityId: IdentityId } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['providerId'], () => ids.parseProviderId(value)],
          [['identityId'], () => ids.parseIdentityId(value)],
          () => value,
        );
      },
      {
        providerId: input.providerId,
        identityId: input.identityId,
      },
    );
    const result = await db.withTransactionF((tran) =>
      gestaltGraph.getGestaltActions(
        ['identity', [providerId, identityId]],
        tran,
      ),
    );

    return {
      actionsList: Object.keys(result) as Array<GestaltAction>,
    };
  };
}

export default GestaltsActionsGetByIdentity;
