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
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<AuthProcessMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
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
    const authFlow = provider.authenticate(ctx.timer.getTimeout());
    let authFlowResult = await authFlow.next();
    if (authFlowResult.done) {
      never();
    }
    if (ctx.signal.aborted) throw ctx.signal.reason;
    yield {
      request: {
        url: authFlowResult.value.url,
        dataMap: authFlowResult.value.data,
      },
    };
    authFlowResult = await authFlow.next();
    if (!authFlowResult.done) {
      never();
    }
    if (ctx.signal.aborted) throw ctx.signal.reason;
    yield {
      response: {
        identityId: authFlowResult.value,
      },
    };
  }
}

export { IdentitiesAuthenticateHandler };
