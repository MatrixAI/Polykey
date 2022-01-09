import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NodeManager } from '../../nodes';
import type { Sigchain } from '../../sigchain';
import type { IdentitiesManager } from '../../identities';
import type { IdentityId, ProviderId } from '../../identities/types';
import type * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import * as clientErrors from '../errors';
import { utils as grpcUtils } from '../../grpc';
import { utils as claimsUtils } from '../../claims';
import { errors as identitiesErrors } from '../../identities';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

/**
 * Augments the keynode with a new identity.
 */
function identitiesClaim({
  identitiesManager,
  sigchain,
  nodeManager,
  authenticate,
}: {
  identitiesManager: IdentitiesManager;
  sigchain: Sigchain;
  nodeManager: NodeManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<identitiesPB.Provider, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EmptyMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Check provider is authenticated
      const providerId = call.request.getProviderId() as ProviderId;
      const provider = identitiesManager.getProvider(providerId);
      if (provider == null) throw new clientErrors.ErrorClientInvalidProvider();
      const identityId = call.request.getIdentityId() as IdentityId;
      const identities = await provider.getAuthIdentityIds();
      if (!identities.includes(identityId)) {
        throw new identitiesErrors.ErrorProviderUnauthenticated();
      }
      // Create identity claim on our node
      const [, claim] = await sigchain.addClaim({
        type: 'identity',
        node: nodeManager.getNodeId(),
        provider: providerId,
        identity: identityId,
      });
      // Publish claim on identity
      const claimDecoded = claimsUtils.decodeClaim(claim);
      await provider.publishClaim(identityId, claimDecoded);
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default identitiesClaim;
