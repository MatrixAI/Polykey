import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  IdentityMessage,
} from '../types.js';
import type { ProviderId } from '../../ids/index.js';
import type IdentitiesManager from '../../identities/IdentitiesManager.js';
import { ServerHandler } from '@matrixai/rpc';
import * as ids from '../../ids/index.js';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';

class IdentitiesAuthenticatedGet extends ServerHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams<{ providerId?: string }>,
  ClientRPCResponseResult<IdentityMessage>
> {
  public handle = async function* (
    input: ClientRPCRequestParams<{ providerId?: string }>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<IdentityMessage>> {
    const { identitiesManager }: { identitiesManager: IdentitiesManager } =
      this.container;
    let providerId: ProviderId | undefined;
    if (input.providerId != null) {
      providerId = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['providerId'], () => ids.parseProviderId(value)],
            () => value,
          );
        },
        {
          providerId: input.providerId,
        },
      ).providerId;
    }
    const providerIds: Array<ProviderId> =
      providerId == null
        ? (Object.keys(identitiesManager.getProviders()) as Array<ProviderId>)
        : [providerId];
    for (const providerId of providerIds) {
      const provider = identitiesManager.getProvider(providerId);
      if (provider == null) continue;
      const identities = await provider.getAuthIdentityIds();
      for (const identityId of identities) {
        ctx.signal.throwIfAborted();
        yield {
          providerId: provider.id,
          identityId: identityId,
        };
      }
    }
  };
}

export default IdentitiesAuthenticatedGet;
