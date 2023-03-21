import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { ProviderId } from 'ids/index';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { IdentityMessage } from 'client/handlers/types';
import { ServerCaller } from '../../rpc/callers';
import { ServerHandler } from '../../rpc/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const identitiesAuthenticatedGet = new ServerCaller<
  ClientRPCRequestParams<{
    providerId?: string;
  }>,
  ClientRPCResponseResult<IdentityMessage>
>();

class IdentitiesAuthenticatedGetHandler extends ServerHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams<{
    providerId?: string;
  }>,
  ClientRPCResponseResult<IdentityMessage>
> {
  public async *handle(
    input: ClientRPCRequestParams<{
      providerId?: string;
    }>,
  ): AsyncGenerator<ClientRPCResponseResult<IdentityMessage>> {
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
