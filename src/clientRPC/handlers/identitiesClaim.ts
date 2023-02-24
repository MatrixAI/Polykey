import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { IdentityId, ProviderId } from 'ids/index';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { ClaimIdMessage, IdentityMessage } from 'clientRPC/handlers/types';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const identitiesClaim = new UnaryCaller<
  RPCRequestParams<IdentityMessage>,
  RPCResponseResult<ClaimIdMessage>
>();

class IdentitiesClaimHandler extends UnaryHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  RPCRequestParams<IdentityMessage>,
  RPCResponseResult<ClaimIdMessage>
> {
  public async handle(
    input: RPCRequestParams<IdentityMessage>,
  ): Promise<RPCResponseResult<ClaimIdMessage>> {
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
  }
}

export { identitiesClaim, IdentitiesClaimHandler };
