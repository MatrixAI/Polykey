import type {
  AuthProcessMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '../types';
import type { ProviderId } from '../../ids';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import { ServerHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import * as identitiesErrors from '../../identities/errors';
import { validateSync } from '../../validation';
import { matchSync, never } from '../../utils';

class IdentitiesAuthenticate extends ServerHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams<{ providerId: string }>,
  ClientRPCResponseResult<AuthProcessMessage>
> {
  public timeout = 120000; // 2 Minutes
  public handle = async function* (
    input: ClientRPCRequestParams<{ providerId: string }>,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<AuthProcessMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const { identitiesManager }: { identitiesManager: IdentitiesManager } =
      this.container;
    const {
      providerId,
    }: {
      providerId: ProviderId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['providerId'], () => ids.parseProviderId(value)],
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
      never('authFlow signalled done too soon');
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
      never('authFlow did not signal done when expected');
    }
    if (ctx.signal.aborted) throw ctx.signal.reason;
    yield {
      response: {
        identityId: authFlowResult.value,
      },
    };
  };
}

export default IdentitiesAuthenticate;
