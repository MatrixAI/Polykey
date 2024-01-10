import type { ClientRPCRequestParams, ClientRPCResponseResult } from './types';
import type { Session } from '../sessions';
import type {
  JSONRPCRequest,
  JSONRPCResponse,
  MiddlewareFactory,
} from '@matrixai/rpc';
import type SessionManager from '../sessions/SessionManager';
import type KeyRing from '../keys/KeyRing';
import * as authenticationMiddlewareUtils from './authenticationMiddleware';

function middlewareServer(
  sessionManager: SessionManager,
  keyRing: KeyRing,
  customMiddlewareFactory?: MiddlewareFactory<
    JSONRPCRequest<ClientRPCRequestParams>,
    JSONRPCRequest<ClientRPCRequestParams>,
    JSONRPCResponse<ClientRPCResponseResult>,
    JSONRPCResponse<ClientRPCResponseResult>
  >,
): MiddlewareFactory<
  JSONRPCRequest<ClientRPCRequestParams>,
  JSONRPCRequest<ClientRPCRequestParams>,
  JSONRPCResponse<ClientRPCResponseResult>,
  JSONRPCResponse<ClientRPCResponseResult>
> {
  const authMiddlewareFactory =
    authenticationMiddlewareUtils.authenticationMiddlewareServer(
      sessionManager,
      keyRing,
    );
  return (ctx, cancel, meta) => {
    const authMiddleware = authMiddlewareFactory(ctx, cancel, meta);
    const customMiddleware = customMiddlewareFactory?.(ctx, cancel, meta);
    // Order is auth -> custom
    return {
      forward: {
        writable: authMiddleware.forward.writable,
        readable:
          customMiddleware == null
            ? authMiddleware.forward.readable
            : authMiddleware.forward.readable.pipeThrough(
                customMiddleware.forward,
              ),
      },
      reverse: {
        writable:
          customMiddleware?.reverse.writable ?? authMiddleware.reverse.writable,
        readable:
          customMiddleware == null
            ? authMiddleware.reverse.readable
            : customMiddleware.reverse.readable.pipeThrough(
                authMiddleware.reverse,
              ),
      },
    };
  };
}

function middlewareClient(
  session: Session,
  customMiddlewareFactory?: MiddlewareFactory<
    JSONRPCRequest<ClientRPCRequestParams>,
    JSONRPCRequest<ClientRPCRequestParams>,
    JSONRPCResponse<ClientRPCResponseResult>,
    JSONRPCResponse<ClientRPCResponseResult>
  >,
): MiddlewareFactory<
  JSONRPCRequest<ClientRPCRequestParams>,
  JSONRPCRequest<ClientRPCRequestParams>,
  JSONRPCResponse<ClientRPCResponseResult>,
  JSONRPCResponse<ClientRPCResponseResult>
> {
  const authMiddlewareFactory =
    authenticationMiddlewareUtils.authenticationMiddlewareClient(session);
  return (ctx, cancel, meta) => {
    const authMiddleware = authMiddlewareFactory(ctx, cancel, meta);
    const customMiddleware = customMiddlewareFactory?.(ctx, cancel, meta);
    // Order is custom -> auth
    return {
      forward: {
        writable:
          customMiddleware?.forward.writable ?? authMiddleware.forward.writable,
        readable:
          customMiddleware == null
            ? authMiddleware.forward.readable
            : customMiddleware.forward.readable.pipeThrough(
                authMiddleware.forward,
              ),
      },
      reverse: {
        writable: authMiddleware.reverse.writable,
        readable:
          customMiddleware == null
            ? authMiddleware.reverse.readable
            : authMiddleware.reverse.readable.pipeThrough(
                customMiddleware.reverse,
              ),
      },
    };
  };
}

export { middlewareServer, middlewareClient };
