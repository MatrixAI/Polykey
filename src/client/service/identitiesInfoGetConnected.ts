import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type { IdentityId, ProviderId } from '../../identities/types';
import * as clientErrors from '../errors';
import { utils as grpcUtils } from '../../grpc';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';

function identitiesInfoGetConnected({
  identitiesManager,
  authenticate,
}: {
  identitiesManager: IdentitiesManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerWritableStream<
      identitiesPB.ProviderSearch,
      identitiesPB.Info
    >,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const providerId = call.request
        .getProvider()
        ?.getProviderId() as ProviderId;
      const identityId = call.request
        .getProvider()
        ?.getIdentityId() as IdentityId;
      const provider = identitiesManager.getProvider(providerId);
      if (provider == null) throw new clientErrors.ErrorClientInvalidProvider();

      const identities = provider.getConnectedIdentityDatas(
        identityId,
        call.request.getSearchTermList(),
      );

      for await (const identity of identities) {
        const identityInfoMessage = new identitiesPB.Info();
        const providerMessage = new identitiesPB.Provider();
        providerMessage.setProviderId(identity.providerId);
        providerMessage.setIdentityId(identity.identityId);
        identityInfoMessage.setProvider(providerMessage);
        identityInfoMessage.setName(identity.name ?? '');
        identityInfoMessage.setEmail(identity.email ?? '');
        identityInfoMessage.setUrl(identity.url ?? '');
        await genWritable.next(identityInfoMessage);
      }
      await genWritable.next(null);
      return;
    } catch (err) {
      await genWritable.throw(err);
      return;
    }
  };
}

export default identitiesInfoGetConnected;
