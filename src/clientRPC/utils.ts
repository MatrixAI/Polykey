import type { SessionToken } from '../sessions/types';
import type KeyRing from '../keys/KeyRing';
import type SessionManager from '../sessions/SessionManager';
import type { Session } from '../sessions';
import type { ClientDataAndMetadata } from './types';
import type { JSONValue } from '../types';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  MiddlewareFactory,
} from '../RPC/types';
import { TransformStream } from 'stream/web';
import * as clientErrors from '../client/errors';
import * as utils from '../utils';

async function authenticate(
  sessionManager: SessionManager,
  keyRing: KeyRing,
  message: JsonRpcRequest<ClientDataAndMetadata<JSONValue>>,
) {
  if (message.params == null) throw new clientErrors.ErrorClientAuthMissing();
  if (message.params.metadata == null) {
    throw new clientErrors.ErrorClientAuthMissing();
  }
  const auth = message.params.metadata.Authorization;
  if (auth == null) {
    throw new clientErrors.ErrorClientAuthMissing();
  }
  if (auth.startsWith('Bearer ')) {
    const token = auth.substring(7) as SessionToken;
    if (!(await sessionManager.verifyToken(token))) {
      throw new clientErrors.ErrorClientAuthDenied();
    }
  } else if (auth.startsWith('Basic ')) {
    const encoded = auth.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const match = decoded.match(/:(.*)/);
    if (match == null) {
      throw new clientErrors.ErrorClientAuthFormat();
    }
    const password = match[1];
    if (!(await keyRing.checkPassword(password))) {
      throw new clientErrors.ErrorClientAuthDenied();
    }
  } else {
    throw new clientErrors.ErrorClientAuthMissing();
  }
  const token = await sessionManager.createToken();
  return `Bearer ${token}`;
}

function decodeAuth(messageParams: ClientDataAndMetadata<JSONValue>) {
  const auth = messageParams.metadata.Authorization;
  if (auth == null || !auth.startsWith('Bearer ')) {
    return;
  }
  return auth.substring(7) as SessionToken;
}

function encodeAuthFromPassword(password: string): string {
  const encoded = Buffer.from(`:${password}`).toString('base64');
  return `Basic ${encoded}`;
}

function authenticationMiddlewareServer(
  sessionManager: SessionManager,
  keyRing: KeyRing,
): MiddlewareFactory<
  JsonRpcRequest<ClientDataAndMetadata<JSONValue>>,
  JsonRpcResponse<ClientDataAndMetadata<JSONValue>>
> {
  return () => {
    let forwardFirst = true;
    let reverseController;
    let outgoingToken: string | null = null;
    return {
      forward: new TransformStream<
        JsonRpcRequest<ClientDataAndMetadata<JSONValue>>,
        JsonRpcRequest<ClientDataAndMetadata<JSONValue>>
      >({
        transform: async (chunk, controller) => {
          if (forwardFirst) {
            try {
              outgoingToken = await authenticate(
                sessionManager,
                keyRing,
                chunk,
              );
            } catch (e) {
              controller.terminate();
              reverseController.terminate();
              return;
            }
          }
          forwardFirst = false;
          controller.enqueue(chunk);
        },
      }),
      reverse: new TransformStream({
        start: (controller) => {
          reverseController = controller;
        },
        transform: (chunk, controller) => {
          // Add the outgoing metadata to the next message.
          if (outgoingToken != null && 'result' in chunk) {
            chunk.result.metadata.Authorization = outgoingToken;
            outgoingToken = null;
          }
          controller.enqueue(chunk);
        },
      }),
    };
  };
}

function authenticationMiddlewareClient(
  session: Session,
): MiddlewareFactory<
  JsonRpcRequest<ClientDataAndMetadata<JSONValue>>,
  JsonRpcResponse<ClientDataAndMetadata<JSONValue>>
> {
  return () => {
    let forwardFirst = true;
    return {
      forward: new TransformStream<
        JsonRpcRequest<ClientDataAndMetadata<JSONValue>>,
        JsonRpcRequest<ClientDataAndMetadata<JSONValue>>
      >({
        transform: async (chunk, controller) => {
          if (forwardFirst) {
            if (chunk.params == null) utils.never();
            if (chunk.params.metadata.Authorization == null) {
              const token = await session.readToken();
              if (token != null) {
                chunk.params.metadata.Authorization = `Bearer ${token}`;
              }
            }
          }
          forwardFirst = false;
          controller.enqueue(chunk);
        },
      }),
      reverse: new TransformStream<
        JsonRpcResponse<ClientDataAndMetadata<JSONValue>>,
        JsonRpcResponse<ClientDataAndMetadata<JSONValue>>
      >({
        transform: async (chunk, controller) => {
          controller.enqueue(chunk);
          if (!('result' in chunk)) return;
          const token = decodeAuth(chunk.result);
          if (token == null) return;
          await session.writeToken(token);
        },
      }),
    };
  };
}

export {
  authenticate,
  decodeAuth,
  encodeAuthFromPassword,
  authenticationMiddlewareServer,
  authenticationMiddlewareClient,
};
