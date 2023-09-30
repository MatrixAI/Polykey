import type { DB } from '@matrixai/db';
import type { IdentityMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { IdentityId, ProviderId } from '../../ids/index';
import type Discovery from '../../discovery/Discovery';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

class GestaltsGestaltTrustByIdentityHandler extends UnaryHandler<
  {
    gestaltGraph: GestaltGraph;
    db: DB;
    discovery: Discovery;
  },
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult
> {
  public async handle(
    input: ClientRPCRequestParams<IdentityMessage>,
  ): Promise<ClientRPCResponseResult> {
    const { db, gestaltGraph, discovery } = this.container;
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

    // Set the identity in the gestalt graph if not already
    await db.withTransactionF(async (tran) => {
      if (
        (await gestaltGraph.getGestaltByIdentity(
          [providerId, identityId],
          tran,
        )) == null
      ) {
        // Queue the new identity for discovery
        // This will only add the identity to the GG if it is connected to a
        // node (required to set permissions for it)
        await discovery.queueDiscoveryByIdentity(providerId, identityId);
      }
      // We can currently only set permissions for identities that are
      // connected to at least one node. If these conditions are not met, this
      // will throw an error. Since discovery can take time, you may need to
      // reattempt this command if it fails on the first attempt and you expect
      // there to be a linked node for the identity.
      await gestaltGraph.setGestaltAction(
        ['identity', [providerId, identityId]],
        'notify',
        tran,
      );
    });
    return {};
  }
}

export { GestaltsGestaltTrustByIdentityHandler };
