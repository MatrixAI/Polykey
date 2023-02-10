import type {
  ClientHandlerImplementation,
  DuplexHandlerImplementation,
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcResponseError,
  JsonRpcResponseResult,
  ServerManifest,
  RawHandlerImplementation,
  ServerHandlerImplementation,
  UnaryHandlerImplementation,
} from './types';
import type { ReadableWritablePair } from 'stream/web';
import type { JSONValue } from '../types';
import type { ConnectionInfo } from '../network/types';
import type { RPCErrorEvent } from './utils';
import type { MiddlewareFactory } from './types';
import { ReadableStream } from 'stream/web';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import Logger from '@matrixai/logger';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import {
  ClientHandler,
  DuplexHandler,
  RawHandler,
  ServerHandler,
  UnaryHandler,
} from './handlers';
import * as rpcUtils from './utils';
import * as rpcErrors from './errors';
import { never } from '../utils/utils';
import { sysexits } from '../errors';

interface RPCServer extends CreateDestroy {}
@CreateDestroy()
class RPCServer {
  static async createRPCServer({
    manifest,
    middleware = rpcUtils.defaultServerMiddlewareWrapper(),
    logger = new Logger(this.name),
  }: {
    manifest: ServerManifest;
    middleware?: MiddlewareFactory<
      JsonRpcRequest,
      Uint8Array,
      Uint8Array,
      JsonRpcResponseResult
    >;
    logger?: Logger;
  }): Promise<RPCServer> {
    logger.info(`Creating ${this.name}`);
    const rpcServer = new this({
      manifest,
      middleware,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return rpcServer;
  }

  // Properties
  protected logger: Logger;
  protected handlerMap: Map<string, RawHandlerImplementation> = new Map();
  protected activeStreams: Set<PromiseCancellable<void>> = new Set();
  protected events: EventTarget = new EventTarget();
  protected middleware: MiddlewareFactory<
    JsonRpcRequest,
    Uint8Array,
    Uint8Array,
    JsonRpcResponseResult
  >;

  public constructor({
    manifest,
    middleware,
    logger,
  }: {
    manifest: ServerManifest;
    middleware: MiddlewareFactory<
      JsonRpcRequest,
      Uint8Array,
      Uint8Array,
      JsonRpcResponseResult
    >;
    logger: Logger;
  }) {
    for (const [key, manifestItem] of Object.entries(manifest)) {
      if (manifestItem instanceof RawHandler) {
        this.registerRawStreamHandler(key, manifestItem.handle);
        continue;
      }
      if (manifestItem instanceof DuplexHandler) {
        this.registerDuplexStreamHandler(key, manifestItem.handle);
        continue;
      }
      if (manifestItem instanceof ServerHandler) {
        this.registerServerStreamHandler(key, manifestItem.handle);
        continue;
      }
      if (manifestItem instanceof ClientHandler) {
        this.registerClientStreamHandler(key, manifestItem.handle);
        continue;
      }
      if (manifestItem instanceof ClientHandler) {
        this.registerClientStreamHandler(key, manifestItem.handle);
        continue;
      }
      if (manifestItem instanceof UnaryHandler) {
        this.registerUnaryHandler(key, manifestItem.handle);
        continue;
      }
      never();
    }
    this.middleware = middleware;
    this.logger = logger;
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    // Stopping any active steams
    for await (const [activeStream] of this.activeStreams.entries()) {
      activeStream.cancel(new rpcErrors.ErrorRpcStopping());
    }
    for await (const [activeStream] of this.activeStreams.entries()) {
      await activeStream;
    }
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  protected registerRawStreamHandler(
    method: string,
    handler: RawHandlerImplementation,
  ) {
    this.handlerMap.set(method, handler);
  }

  protected registerDuplexStreamHandler<
    I extends JSONValue,
    O extends JSONValue,
  >(method: string, handler: DuplexHandlerImplementation<I, O>) {
    // This needs to handle all the message parsing and conversion from
    // generators to the raw streams.

    const rawSteamHandler: RawHandlerImplementation = (
      [input, header],
      connectionInfo,
      ctx,
    ) => {
      // Setting up middleware
      const middleware = this.middleware(header);
      const forwardStream = input.pipeThrough(middleware.forward);
      const reverseStream = middleware.reverse.writable;
      const events = this.events;
      const outputGen = async function* (): AsyncGenerator<JsonRpcResponse> {
        if (ctx.signal.aborted) throw ctx.signal.reason;
        const dataGen = async function* () {
          for await (const data of forwardStream) {
            yield data.params as I;
          }
        };
        for await (const response of handler(dataGen(), connectionInfo, ctx)) {
          const responseMessage: JsonRpcResponseResult = {
            jsonrpc: '2.0',
            result: response,
            id: null,
          };
          yield responseMessage;
        }
      };
      const outputGenerator = outputGen();
      const reverseMiddlewareStream = new ReadableStream<JsonRpcResponse>({
        pull: async (controller) => {
          try {
            const { value, done } = await outputGenerator.next();
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
          } catch (e) {
            if (rpcUtils.isReturnableError(e)) {
              // We want to convert this error to an error message and pass it along
              const rpcError: JsonRpcError = {
                code: e.exitCode ?? sysexits.UNKNOWN,
                message: e.description ?? '',
                data: rpcUtils.fromError(e),
              };
              const rpcErrorMessage: JsonRpcResponseError = {
                jsonrpc: '2.0',
                error: rpcError,
                id: null,
              };
              controller.enqueue(rpcErrorMessage);
            } else {
              // These errors are emitted to the event system
              events.dispatchEvent(
                new rpcUtils.RPCErrorEvent({
                  detail: {
                    error: e,
                  },
                }),
              );
            }
            await forwardStream.cancel(
              new rpcErrors.ErrorRpcHandlerFailed('Error clean up'),
            );
            controller.close();
          }
        },
        cancel: async (reason) => {
          await outputGenerator.throw(reason);
        },
      });
      void reverseMiddlewareStream.pipeTo(reverseStream).catch(() => {});

      return middleware.reverse.readable;
    };

    this.registerRawStreamHandler(method, rawSteamHandler);
  }

  protected registerUnaryHandler<I extends JSONValue, O extends JSONValue>(
    method: string,
    handler: UnaryHandlerImplementation<I, O>,
  ) {
    const wrapperDuplex: DuplexHandlerImplementation<I, O> = async function* (
      input,
      connectionInfo,
      ctx,
    ) {
      for await (const inputVal of input) {
        yield handler(inputVal, connectionInfo, ctx);
        break;
      }
    };
    this.registerDuplexStreamHandler(method, wrapperDuplex);
  }

  protected registerServerStreamHandler<
    I extends JSONValue,
    O extends JSONValue,
  >(method: string, handler: ServerHandlerImplementation<I, O>) {
    const wrapperDuplex: DuplexHandlerImplementation<I, O> = async function* (
      input,
      connectionInfo,
      ctx,
    ) {
      for await (const inputVal of input) {
        yield* handler(inputVal, connectionInfo, ctx);
        break;
      }
    };
    this.registerDuplexStreamHandler(method, wrapperDuplex);
  }

  protected registerClientStreamHandler<
    I extends JSONValue,
    O extends JSONValue,
  >(method: string, handler: ClientHandlerImplementation<I, O>) {
    const wrapperDuplex: DuplexHandlerImplementation<I, O> = async function* (
      input,
      connectionInfo,
      ctx,
    ) {
      yield handler(input, connectionInfo, ctx);
    };
    this.registerDuplexStreamHandler(method, wrapperDuplex);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public handleStream(
    streamPair: ReadableWritablePair<Uint8Array, Uint8Array>,
    connectionInfo: ConnectionInfo,
  ) {
    // This will take a buffer stream of json messages and set up service
    //  handling for it.
    // Constructing the PromiseCancellable for tracking the active stream
    const abortController = new AbortController();
    const prom = (async () => {
      const { firstMessageProm, headTransformStream } =
        rpcUtils.extractFirstMessageTransform(rpcUtils.parseJsonRpcRequest);
      const inputStreamEndProm = streamPair.readable
        .pipeTo(headTransformStream.writable)
        .catch(() => {});
      const inputStream = headTransformStream.readable;
      // Read a single empty value to consume the first message
      const reader = inputStream.getReader();
      await reader.read();
      reader.releaseLock();
      const leadingMetadataMessage = await firstMessageProm;
      // If the stream ends early then we just stop processing
      if (leadingMetadataMessage == null) {
        await inputStream.cancel(
          new rpcErrors.ErrorRpcHandlerFailed('Missing header'),
        );
        await streamPair.writable.close();
        await inputStreamEndProm;
        return;
      }
      const method = leadingMetadataMessage.method;
      const handler = this.handlerMap.get(method);
      if (handler == null) {
        await inputStream.cancel(
          new rpcErrors.ErrorRpcHandlerFailed('Missing handler'),
        );
        await streamPair.writable.close();
        await inputStreamEndProm;
        return;
      }
      if (abortController.signal.aborted) {
        await inputStream.cancel(
          new rpcErrors.ErrorRpcHandlerFailed('Aborted'),
        );
        await streamPair.writable.close();
        await inputStreamEndProm;
        return;
      }
      const outputStream = handler(
        [inputStream, leadingMetadataMessage],
        connectionInfo,
        { signal: abortController.signal },
      );
      await Promise.allSettled([
        inputStreamEndProm,
        outputStream.pipeTo(streamPair.writable),
      ]);
    })();
    const handlerProm = PromiseCancellable.from(prom).finally(
      () => this.activeStreams.delete(handlerProm),
      abortController,
    );
    // Putting the PromiseCancellable into the active streams map
    this.activeStreams.add(handlerProm);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public addEventListener(
    type: 'error',
    callback: (event: RPCErrorEvent) => void,
    options?: boolean | AddEventListenerOptions | undefined,
  ) {
    this.events.addEventListener(type, callback, options);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public removeEventListener(
    type: 'error',
    callback: (event: RPCErrorEvent) => void,
    options?: boolean | AddEventListenerOptions | undefined,
  ) {
    this.events.removeEventListener(type, callback, options);
  }
}

export default RPCServer;
