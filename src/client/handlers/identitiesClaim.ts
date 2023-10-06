import type { ClaimIdMessage, IdentityMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { IdentityId, ProviderId } from '../../ids/index';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

class IdentitiesClaimHandler extends UnaryHandler<
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

export { IdentitiesClaimHandler };
