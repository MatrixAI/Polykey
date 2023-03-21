import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type GestaltGraph from 'gestalts/GestaltGraph';
import type { DB } from '@matrixai/db';
import type { IdentityId, ProviderId } from 'ids/index';
import type { GestaltAction } from 'gestalts/types';
import type { IdentityMessage } from './types';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const gestaltsActionsGetByIdentity = new UnaryCaller<
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<{
    actionsList: Array<GestaltAction>;
  }>
>();

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
  public async handle(input: ClientRPCRequestParams<IdentityMessage>): Promise<
    ClientRPCResponseResult<{
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

export { gestaltsActionsGetByIdentity, GestaltsActionsGetByIdentityHandler };
