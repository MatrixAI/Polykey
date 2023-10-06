import type { DB } from '@matrixai/db';
import type { IdentityMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { GestaltAction } from '../../gestalts/types';
import type { IdentityId, ProviderId } from '../../ids/index';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

class GestaltsActionsGetByIdentityHandler extends UnaryHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
  },
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<{
    actionsList: Array<GestaltAction>;
  }>
> {
  public handle = async(input: ClientRPCRequestParams<IdentityMessage>): Promise<
    ClientRPCResponseResult<=> {
      actionsList: Array<GestaltAction>;
    }>
  > {
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
    const result = await db.withTransactionF((tran) =>
      gestaltGraph.getGestaltActions(
        ['identity', [providerId, identityId]],
        tran,
      ),
    );

    return {
      actionsList: Object.keys(result) as Array<GestaltAction>,
    };
  }
}

export { GestaltsActionsGetByIdentityHandler };
