import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NodeManager } from '../../nodes';
import type { Sigchain } from '../../sigchain';
import type { IdentitiesManager } from '../../identities';
import type { IdentityId, ProviderId } from '../../identities/types';
import * as clientErrors from '../errors';
import { utils as grpcUtils } from '../../grpc';
import { utils as claimsUtils } from '../../claims';
import { errors as identitiesErrors } from '../../identities';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import { utils as nodeUtils } from '../../nodes';

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
    call: grpc.ServerUnaryCall<identitiesPB.Provider, identitiesPB.Claim>,
    callback: grpc.sendUnaryData<identitiesPB.Claim>,
  ): Promise<void> => {
    const response = new identitiesPB.Claim();
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
        node: nodeUtils.encodeNodeId(nodeManager.getNodeId()),
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
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default identitiesClaim;
