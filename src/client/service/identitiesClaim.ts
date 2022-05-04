import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type KeyManager from '../../keys/KeyManager';
import type { Sigchain } from '../../sigchain';
import type { IdentitiesManager } from '../../identities';
import type { IdentityId, ProviderId } from '../../identities/types';
import type Logger from '@matrixai/logger';
import { utils as grpcUtils } from '../../grpc';
import { utils as claimsUtils } from '../../claims';
import { utils as nodesUtils } from '../../nodes';
import { errors as identitiesErrors } from '../../identities';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';

/**
 * Augments the keynode with a new identity.
 */
function identitiesClaim({
  authenticate,
  identitiesManager,
  sigchain,
  keyManager,
  logger,
}: {
  authenticate: Authenticate;
  identitiesManager: IdentitiesManager;
  sigchain: Sigchain;
  keyManager: KeyManager;
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
      // Check provider is authenticated
      const provider = identitiesManager.getProvider(providerId);
      if (provider == null) {
        throw new identitiesErrors.ErrorProviderMissing();
      }
      const identities = await provider.getAuthIdentityIds();
      if (!identities.includes(identityId)) {
        throw new identitiesErrors.ErrorProviderUnauthenticated();
      }
      // Create identity claim on our node
      const [, claim] = await sigchain.addClaim({
        type: 'identity',
        node: nodesUtils.encodeNodeId(keyManager.getNodeId()),
        provider: providerId,
        identity: identityId,
      });
      // Publish claim on identity
      const claimDecoded = claimsUtils.decodeClaim(claim);
      const claimData = await provider.publishClaim(identityId, claimDecoded);
      response.setClaimId(claimData.id);
      if (claimData.url) {
        response.setUrl(claimData.url);
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default identitiesClaim;
