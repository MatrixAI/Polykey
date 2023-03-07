import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { IdentityId, ProviderId } from 'ids/index';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { ProviderSearchMessage, IdentityInfoMessage } from './types';
import type { IdentityData } from '../../identities/types';
import { ServerCaller } from '../../RPC/callers';
import { ServerHandler } from '../../RPC/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';
import * as identitiesErrors from '../../identities/errors';

const identitiesInfoConnectedGet = new ServerCaller<
  RPCRequestParams<ProviderSearchMessage>,
  RPCResponseResult<IdentityInfoMessage>
>();

class IdentitiesInfoConnectedGetHandler extends ServerHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  RPCRequestParams<ProviderSearchMessage>,
  RPCResponseResult<IdentityInfoMessage>
> {
  public async *handle(
    input: RPCRequestParams<ProviderSearchMessage>,
  ): AsyncGenerator<RPCResponseResult<IdentityInfoMessage>> {
    const { identitiesManager } = this.container;
    const {
      providerIds,
    }: {
      providerIds: Array<ProviderId>;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['providerIds'], () => value.map(validationUtils.parseProviderId)],
          () => value,
        );
      },
      {
        providerIds: input.providerIdList,
      },
    );
    let identityId: IdentityId | undefined;
    if (input.authIdentityId != null) {
      identityId = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['identityId'], () => validationUtils.parseIdentityId(value)],
            () => value,
          );
        },
        {
          identityId: input.authIdentityId,
        },
      ).identityId;
    }
    // Process options that were set
    if (providerIds.length === 0) {
      Object.keys(identitiesManager.getProviders()).forEach((id) =>
        providerIds.push(id as ProviderId),
      );
    }
    const getDisconnected = input.disconnected;
    if (getDisconnected) {
      // Can only get connected identities at this stage
      throw new identitiesErrors.ErrorProviderUnimplemented();
    }
    const identities: Array<AsyncGenerator<IdentityData>> = [];
    for (const providerId of providerIds) {
      // Get provider from id
      const provider = identitiesManager.getProvider(providerId);
      if (provider === undefined) {
        throw new identitiesErrors.ErrorProviderMissing();
      }
      // Get our own authenticated identity in order to query, skip provider
      // if not authenticated
      const authIdentities = await provider.getAuthIdentityIds();
      if (authIdentities.length === 0) {
        continue;
      }
      const authIdentityId =
        identityId === undefined ? authIdentities[0] : identityId;
      identities.push(
        provider.getConnectedIdentityDatas(
          authIdentityId,
          input.searchTermList,
        ),
      );
    }
    let count = 0;
    for (const gen of identities) {
      for await (const identity of gen) {
        if (input.limit !== undefined && count >= input.limit) break;
        yield {
          providerId: identity.providerId,
          identityId: identity.identityId,
          name: identity.name ?? '',
          email: identity.email ?? '',
          url: identity.url ?? '',
        };
        count++;
      }
    }
  }
}

export { identitiesInfoConnectedGet, IdentitiesInfoConnectedGetHandler };
