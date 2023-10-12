import type {
  ClaimIdMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  IdentityMessage,
} from '../types';
import type { IdentityId, ProviderId } from '../../ids';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

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
    const { identitiesManager } = this.container;
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
