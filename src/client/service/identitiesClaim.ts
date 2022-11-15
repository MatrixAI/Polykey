import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type Sigchain from '../../sigchain/Sigchain';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { IdentityId, ProviderId } from '../../identities/types';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as nodesUtils from '../../nodes/utils';
import * as identitiesErrors from '../../identities/errors';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import * as clientUtils from '../utils';
import { SignedClaim } from 'claims/types';
import { ClaimLinkIdentity } from 'claims/payloads/index';

/**
 * Augments the keynode with a new identity.
 */
function identitiesClaim({
  authenticate,
  identitiesManager,
  logger,
}: {
  authenticate: Authenticate;
  identitiesManager: IdentitiesManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<identitiesPB.Provider, identitiesPB.Claim>,
    callback: grpc.sendUnaryData<identitiesPB.Claim>,
  ): Promise<void> => {
    try {
      const response = new identitiesPB.Claim();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        providerId,
        identityId,
      }: {
        providerId: ProviderId;
        identityId: IdentityId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['providerId'], () => validationUtils.parseProviderId(value)],
            [['identityId'], () => validationUtils.parseIdentityId(value)],
            () => value,
          );
        },
        {
          providerId: call.request.getProviderId(),
          identityId: call.request.getIdentityId(),
        },
      );
      const claimData = await identitiesManager.handleClaimIdentity(providerId, identityId);
      response.setClaimId(claimData.id);
      if (claimData.url) {
        response.setUrl(claimData.url);
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        identitiesErrors.ErrorProviderMissing,
        identitiesErrors.ErrorProviderUnauthenticated,
      ]) && logger.error(`${identitiesClaim.name}:${e}`);
      return;
    }
  };
}

export default identitiesClaim;
