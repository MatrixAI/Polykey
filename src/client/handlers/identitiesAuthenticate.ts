import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { ProviderId } from 'ids/index';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { AuthProcessMessage } from 'client/handlers/types';
import * as identitiesErrors from '../../identities/errors';
import { ServerHandler } from '../../rpc/handlers';
import { validateSync } from '../../validation/index';
import { matchSync, never } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

class IdentitiesAuthenticateHandler extends ServerHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams<{
    providerId: string;
  }>,
  ClientRPCResponseResult<AuthProcessMessage>
> {
  public async *handle(
    input: ClientRPCRequestParams<{
      providerId: string;
    }>,
    _,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<AuthProcessMessage>> {
    const { identitiesManager } = this.container;
    const {
      providerId,
    }: {
      providerId: ProviderId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['providerId'], () => validationUtils.parseProviderId(value)],
          () => value,
        );
      },
      {
        providerId: input.providerId,
      },
    );
    const provider = identitiesManager.getProvider(providerId);
    if (provider == null) {
      throw new identitiesErrors.ErrorProviderMissing();
    }
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const authFlow = provider.authenticate(ctx.timer.getTimeout());
    if (ctx.signal.aborted) throw ctx.signal.reason;
    let authFlowResult = await authFlow.next();
    if (authFlowResult.done) {
      never();
    }
    yield {
      request: {
        url: authFlowResult.value.url,
        dataMap: authFlowResult.value.data,
      },
    };
    if (ctx.signal.aborted) throw ctx.signal.reason;
    authFlowResult = await authFlow.next();
    if (!authFlowResult.done) {
      never();
    }
    yield {
      response: {
        identityId: authFlowResult.value,
      },
    };
  }
}

export { IdentitiesAuthenticateHandler };
