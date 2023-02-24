import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { ProviderId } from 'ids/index';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { IdentityMessage } from 'clientRPC/handlers/types';
import { ServerCaller } from '../../RPC/callers';
import { ServerHandler } from '../../RPC/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const identitiesAuthenticatedGet = new ServerCaller<
  RPCRequestParams<{
    providerId?: string;
  }>,
  RPCResponseResult<IdentityMessage>
>();

class IdentitiesAuthenticatedGetHandler extends ServerHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  RPCRequestParams<{
    providerId?: string;
  }>,
  RPCResponseResult<IdentityMessage>
> {
  public async *handle(
    input: RPCRequestParams<{
      providerId?: string;
    }>,
  ): AsyncGenerator<RPCResponseResult<IdentityMessage>> {
    const { identitiesManager } = this.container;
    let providerId: ProviderId | undefined;
    if (input.providerId != null) {
      providerId = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['providerId'], () => validationUtils.parseProviderId(value)],
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
      if (provider == null) {
        continue;
      }
      const identities = await provider.getAuthIdentityIds();
      for (const identityId of identities) {
        yield {
          providerId: provider.id,
          identityId: identityId,
        };
      }
    }
  }
}

export { identitiesAuthenticatedGet, IdentitiesAuthenticatedGetHandler };
