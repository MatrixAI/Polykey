import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { Session } from '../../sessions';
import type {
  JSONRPCRequest,
  JSONRPCResponse,
  MiddlewareFactory,
} from '../../rpc/types';
import type SessionManager from '../../sessions/SessionManager';
import type KeyRing from '../../keys/KeyRing';
import * as authenticationMiddlewareUtils from './authenticationMiddleware';
import * as timeoutMiddlewareUtils from './timeoutMiddleware';

function middlewareServer(
  sessionManager: SessionManager,
  keyRing: KeyRing,
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
  return (ctx) => {
    const authMiddleware = authMiddlewareFactory(ctx);
    const timeoutMiddleware =
      timeoutMiddlewareUtils.timeoutMiddlewareServer(ctx);
    // Order is auth -> timeout
    return {
      forward: {
        writable: authMiddleware.forward.writable,
        readable: authMiddleware.forward.readable.pipeThrough(
          timeoutMiddleware.forward,
        ),
      },
      reverse: {
        writable: timeoutMiddleware.reverse.writable,
        readable: timeoutMiddleware.reverse.readable.pipeThrough(
          authMiddleware.reverse,
        ),
      },
    };
  };
}

function middlewareClient(
  session: Session,
): MiddlewareFactory<
  JSONRPCRequest<ClientRPCRequestParams>,
  JSONRPCRequest<ClientRPCRequestParams>,
  JSONRPCResponse<ClientRPCResponseResult>,
  JSONRPCResponse<ClientRPCResponseResult>
> {
  const authMiddlewareFactory =
    authenticationMiddlewareUtils.authenticationMiddlewareClient(session);
  return (ctx) => {
    const authMiddleware = authMiddlewareFactory(ctx);
    const timeoutMiddleware =
      timeoutMiddlewareUtils.timeoutMiddlewareClient(ctx);
    // Order is timeout -> auth
    return {
      forward: {
        writable: timeoutMiddleware.forward.writable,
        readable: timeoutMiddleware.forward.readable.pipeThrough(
          authMiddleware.forward,
        ),
      },
      reverse: {
        writable: authMiddleware.reverse.writable,
        readable: authMiddleware.reverse.readable.pipeThrough(
          timeoutMiddleware.reverse,
        ),
      },
    };
  };
}

export { middlewareServer, middlewareClient };