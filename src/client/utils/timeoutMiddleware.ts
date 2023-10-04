import type { ContextTimed } from '@matrixai/contexts';
import type { JSONRPCRequest, JSONRPCResponse } from '@matrixai/rpc/dist/types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { JSONValue } from '@matrixai/rpc/dist/types';
import { TransformStream } from 'stream/web';

/**
 * This adds its timeout to the reverse metadata and updates it's timeout based
 * on the forward metadata.
 */
function timeoutMiddlewareServer(
  ctx: ContextTimed,
  _cancel: (reason?: any) => void,
  _meta: Record<string, JSONValue> | undefined,
) {
  const currentTimeout = ctx.timer.delay;
  // Flags for tracking if the first message has been processed
  let forwardFirst = true;
  let reverseFirst = true;
  return {
    forward: new TransformStream<
      JSONRPCRequest<ClientRPCRequestParams>,
      JSONRPCRequest<ClientRPCRequestParams>
    >({
      transform: (chunk, controller) => {
        controller.enqueue(chunk);
        if (forwardFirst) {
          forwardFirst = false;
          const clientTimeout = chunk.params?.metadata?.timeout;

          if (clientTimeout == null) return;
          if (clientTimeout < currentTimeout) ctx.timer.reset(clientTimeout);
        }
      },
    }),
    reverse: new TransformStream<
      JSONRPCResponse<ClientRPCResponseResult>,
      JSONRPCResponse<ClientRPCResponseResult>
    >({
      transform: (chunk, controller) => {
        if (reverseFirst) {
          reverseFirst = false;
          if ('result' in chunk) {
            if (chunk.result.metadata == null) chunk.result.metadata = {};
            chunk.result.metadata.timeout = currentTimeout;
          }
        }
        controller.enqueue(chunk);
      },
    }),
  };
}

/**
 * This adds its own timeout to the forward metadata and updates it's timeout
 * based on the reverse metadata.
 * @param ctx
 * @param _cancel
 * @param _meta
 */
function timeoutMiddlewareClient(
  ctx: ContextTimed,
  _cancel: (reason?: any) => void,
  _meta: Record<string, JSONValue> | undefined,
) {
  const currentTimeout = ctx.timer.delay;
  // Flags for tracking if the first message has been processed
  let forwardFirst = true;
  let reverseFirst = true;
  return {
    forward: new TransformStream<
      JSONRPCRequest<ClientRPCRequestParams>,
      JSONRPCRequest<ClientRPCRequestParams>
    >({
      transform: (chunk, controller) => {
        if (forwardFirst) {
          forwardFirst = false;
          if (chunk.params == null) chunk.params = {};
          if (chunk.params.metadata == null) chunk.params.metadata = {};
          chunk.params.metadata.timeout = currentTimeout;
        }
        controller.enqueue(chunk);
      },
    }),
    reverse: new TransformStream<
      JSONRPCResponse<ClientRPCResponseResult>,
      JSONRPCResponse<ClientRPCResponseResult>
    >({
      transform: (chunk, controller) => {
        controller.enqueue(chunk);
        if (reverseFirst) {
          reverseFirst = false;
          if ('result' in chunk) {
            const clientTimeout = chunk.result?.metadata?.timeout;
            if (clientTimeout == null) return;
            if (clientTimeout < currentTimeout) ctx.timer.reset(clientTimeout);
          }
        }
      },
    }),
  };
}

export { timeoutMiddlewareServer, timeoutMiddlewareClient };
