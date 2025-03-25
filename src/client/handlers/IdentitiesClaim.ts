import type {
  ClaimIdMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  IdentityMessage,
} from '../types.js';
import type { IdentityId, ProviderId } from '../../ids/index.js';
import type IdentitiesManager from '../../identities/IdentitiesManager.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids/index.js';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';

class IdentitiesClaim extends UnaryHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<ClaimIdMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<IdentityMessage>,
  ): Promise<ClientRPCResponseResult<ClaimIdMessage>> => {
    const { identitiesManager }: { identitiesManager: IdentitiesManager } =
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

    const claimData = await identitiesManager.handleClaimIdentity(
      providerId,
      identityId,
    );

    return {
      claimId: claimData.id,
      url: claimData.url,
    };
  };
}

export default IdentitiesClaim;
