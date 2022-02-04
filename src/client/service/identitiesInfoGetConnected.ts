import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type { IdentityId, ProviderId } from '../../identities/types';
import { utils as grpcUtils } from '../../grpc';
import { errors as identitiesErrors } from '../../identities';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
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
          providerId: call.request.getProvider()?.getProviderId(),
          identityId: call.request.getProvider()?.getIdentityId(),
        },
      );
      const provider = identitiesManager.getProvider(providerId);
      if (provider == null) {
        throw new identitiesErrors.ErrorProviderMissing();
      }
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
    } catch (e) {
      await genWritable.throw(e);
      return;
    }
  };
}

export default identitiesInfoGetConnected;
