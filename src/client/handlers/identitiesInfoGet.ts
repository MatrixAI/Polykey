import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { IdentityId, ProviderId } from 'ids/index';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { ProviderSearchMessage, IdentityInfoMessage } from './types';
import type { IdentityData } from '../../identities/types';
import { ServerCaller } from '../../rpc/callers';
import { ServerHandler } from '../../rpc/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';
import * as identitiesErrors from '../../identities/errors';
import * as identitiesUtils from '../../identities/utils';

const identitiesInfoGet = new ServerCaller<
  ClientRPCRequestParams<ProviderSearchMessage>,
  ClientRPCResponseResult<IdentityInfoMessage>
>();

class IdentitiesInfoGetHandler extends ServerHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams<ProviderSearchMessage>,
  ClientRPCResponseResult<IdentityInfoMessage>
> {
  public async *handle(
    input: ClientRPCRequestParams<ProviderSearchMessage>,
  ): AsyncGenerator<ClientRPCResponseResult<IdentityInfoMessage>> {
    const { identitiesManager } = this.container;
    const {
      providerIds,
      identityId,
    }: {
      providerIds: Array<ProviderId>;
      identityId: IdentityId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['providerIds'], () => value.map(validationUtils.parseProviderId)],
          [['identityId'], () => validationUtils.parseIdentityId(value)],
          () => value,
        );
      },
      {
        providerIds: input.providerIdList,
        identityId: input.identityId,
      },
    );

    // Process options that were set
    if (providerIds.length === 0) {
      Object.keys(identitiesManager.getProviders()).forEach((id) =>
        providerIds.push(id as ProviderId),
      );
    }
    const searchTerms = input.searchTermList ?? [];
    const getDisconnected = input.disconnected;
    if (getDisconnected) {
      // Currently, this command performs the same way regardless of whether
      // this option is set (i.e. always disconnected)
    }
    const identities: Array<IdentityData | undefined> = [];
    for (const providerId of providerIds) {
      // Get provider from id
      const provider = identitiesManager.getProvider(providerId);
      if (provider === undefined) {
        throw new identitiesErrors.ErrorProviderMissing();
      }
      // Get our own authenticated identity in order to query, skip provider
      // if not authenticated
      // It doesn't matter which one we use since `getIdentityData` does not
      // require the identity to be connected
      const authIdentities = await provider.getAuthIdentityIds();
      if (authIdentities.length === 0) {
        continue;
      }
      // Get identity data
      identities.push(
        await provider.getIdentityData(authIdentities[0], identityId),
      );
    }
    if (input.limit === undefined || input.limit > identities.length) {
      input.limit = identities.length;
    }
    for (let i = 0; i < input.limit; i++) {
      const identity = identities[i];
      if (identity !== undefined) {
        if (identitiesUtils.matchIdentityData(identity, searchTerms)) {
          yield {
            providerId: identity.providerId,
            identityId: identity.identityId,
            name: identity.name ?? '',
            email: identity.email ?? '',
            url: identity.url ?? '',
          };
        }
      }
    }
  }
}

export { identitiesInfoGet, IdentitiesInfoGetHandler };
