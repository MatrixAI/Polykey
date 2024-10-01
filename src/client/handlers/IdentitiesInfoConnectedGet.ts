import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  IdentityInfoMessage,
  ProviderSearchMessage,
} from '../types';
import type { IdentityId, ProviderId } from '../../ids';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { IdentityData } from '../../identities/types';
import { ServerHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import * as identitiesErrors from '../../identities/errors';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

class IdentitiesInfoConnectedGet extends ServerHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams<ProviderSearchMessage>,
  ClientRPCResponseResult<IdentityInfoMessage>
> {
  public handle = async function* (
    input: ClientRPCRequestParams<ProviderSearchMessage>,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<IdentityInfoMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const { identitiesManager }: { identitiesManager: IdentitiesManager } =
      this.container;
    const {
      providerIds,
    }: {
      providerIds: Array<ProviderId>;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['providerIds'], () => value.map(ids.parseProviderId)],
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
            [['identityId'], () => ids.parseIdentityId(value)],
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
        if (ctx.signal.aborted) throw ctx.signal.reason;
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
  };
}

export default IdentitiesInfoConnectedGet;
