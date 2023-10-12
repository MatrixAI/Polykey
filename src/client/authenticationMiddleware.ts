import type {
  JSONRPCRequest,
  JSONRPCResponse,
  MiddlewareFactory,
} from '@matrixai/rpc';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from './types';
import type { Session } from '../sessions';
import type SessionManager from '../sessions/SessionManager';
import type KeyRing from '../keys/KeyRing';
import type { JSONRPCError, JSONRPCResponseError } from '@matrixai/rpc';
import { TransformStream } from 'stream/web';
import { authenticate, decodeAuth } from './utils';
import { sysexits } from '../errors';
import * as utils from '../utils';
import * as networkUtils from '../network/utils';

function authenticationMiddlewareServer(
  sessionManager: SessionManager,
  keyRing: KeyRing,
): MiddlewareFactory<
  JSONRPCRequest<ClientRPCRequestParams>,
  JSONRPCRequest<ClientRPCRequestParams>,
  JSONRPCResponse<ClientRPCResponseResult>,
  JSONRPCResponse<ClientRPCResponseResult>
> {
  return () => {
    // Flag for tracking if the first message has been processed
    let forwardFirst = true;
    let reverseController;
    let outgoingToken: string | null = null;
    return {
      forward: new TransformStream<
        JSONRPCRequest<ClientRPCRequestParams>,
        JSONRPCRequest<ClientRPCRequestParams>
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
              controller.error(e);
              const rpcError: JSONRPCError = {
                code: e.exitCode ?? sysexits.UNKNOWN,
                message: e.description ?? '',
                data: networkUtils.fromError(e),
              };
              const rpcErrorMessage: JSONRPCResponseError = {
                jsonrpc: '2.0',
                error: rpcError,
                id: null,
              };
              reverseController.enqueue(rpcErrorMessage);
              reverseController.error(e);
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
                authorization: '',
              };
            }
            chunk.result.metadata.authorization = outgoingToken;
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
  JSONRPCRequest<ClientRPCRequestParams>,
  JSONRPCRequest<ClientRPCRequestParams>,
  JSONRPCResponse<ClientRPCResponseResult>,
  JSONRPCResponse<ClientRPCResponseResult>
> {
  return () => {
    // Flag for tracking if the first message has been processed
    let forwardFirst = true;
    return {
      forward: new TransformStream<
        JSONRPCRequest<ClientRPCRequestParams>,
        JSONRPCRequest<ClientRPCRequestParams>
      >({
        transform: async (chunk, controller) => {
          if (forwardFirst) {
            if (chunk.params == null) utils.never();
            if (chunk.params.metadata?.authorization == null) {
              const token = await session.readToken();
              if (token != null) {
                if (chunk.params.metadata == null) {
                  chunk.params.metadata = {
                    authorization: '',
                  };
                }
                chunk.params.metadata.authorization = `Bearer ${token}`;
              }
            }
          }
          forwardFirst = false;
          controller.enqueue(chunk);
        },
      }),
      reverse: new TransformStream<
        JSONRPCResponse<ClientRPCResponseResult>,
        JSONRPCResponse<ClientRPCResponseResult>
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
