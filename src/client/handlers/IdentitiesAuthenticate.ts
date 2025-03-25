import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@matrixai/rpc';
import type {
  AuthProcessMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '../types.js';
import type { ProviderId } from '../../ids/index.js';
import type IdentitiesManager from '../../identities/IdentitiesManager.js';
import { ServerHandler } from '@matrixai/rpc';
import * as ids from '../../ids/index.js';
import * as identitiesErrors from '../../identities/errors.js';
import { validateSync } from '../../validation/index.js';
import { matchSync, never } from '../../utils/index.js';

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
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<AuthProcessMessage>> {
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
    ctx.signal.throwIfAborted();
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
    ctx.signal.throwIfAborted();
    yield {
      response: {
        identityId: authFlowResult.value,
      },
    };
  };
}

export default IdentitiesAuthenticate;
