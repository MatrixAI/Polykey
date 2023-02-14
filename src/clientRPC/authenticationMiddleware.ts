import type {
  JsonRpcRequest,
  JsonRpcResponse,
  MiddlewareFactory,
} from '../RPC/types';
import type { RPCRequestParams, RPCResponseResult } from './types';
import type { Session } from '../sessions';
import type SessionManager from '../sessions/SessionManager';
import type KeyRing from '../keys/KeyRing';
import { TransformStream } from 'stream/web';
import { authenticate, decodeAuth } from './utils';
import * as utils from '../utils';

function authenticationMiddlewareServer(
  sessionManager: SessionManager,
  keyRing: KeyRing,
): MiddlewareFactory<
  JsonRpcRequest<RPCRequestParams>,
  JsonRpcRequest<RPCRequestParams>,
  JsonRpcResponse<RPCResponseResult>,
  JsonRpcResponse<RPCResponseResult>
> {
  return () => {
    let forwardFirst = true;
    let reverseController;
    let outgoingToken: string | null = null;
    return {
      forward: new TransformStream<
        JsonRpcRequest<RPCRequestParams>,
        JsonRpcRequest<RPCRequestParams>
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
            if (chunk.result.metadata == null) {
              chunk.result.metadata = {
                Authorization: '',
              };
            }
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
  JsonRpcRequest<RPCRequestParams>,
  JsonRpcRequest<RPCRequestParams>,
  JsonRpcResponse<RPCResponseResult>,
  JsonRpcResponse<RPCResponseResult>
> {
  return () => {
    let forwardFirst = true;
    return {
      forward: new TransformStream<
        JsonRpcRequest<RPCRequestParams>,
        JsonRpcRequest<RPCRequestParams>
      >({
        transform: async (chunk, controller) => {
          if (forwardFirst) {
            if (chunk.params == null) utils.never();
            if (chunk.params.metadata?.Authorization == null) {
              const token = await session.readToken();
              if (token != null) {
                if (chunk.params.metadata == null) {
                  chunk.params.metadata = {
                    Authorization: '',
                  };
                }
                chunk.params.metadata.Authorization = `Bearer ${token}`;
              }
            }
          }
          forwardFirst = false;
          controller.enqueue(chunk);
        },
      }),
      reverse: new TransformStream<
        JsonRpcResponse<RPCResponseResult>,
        JsonRpcResponse<RPCResponseResult>
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

export { authenticationMiddlewareServer, authenticationMiddlewareClient };
