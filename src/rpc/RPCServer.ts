import type {
  ClientHandlerImplementation,
  DuplexHandlerImplementation,
  JSONRPCError,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCResponseError,
  JSONRPCResponseResult,
  ServerManifest,
  RawHandlerImplementation,
  ServerHandlerImplementation,
  UnaryHandlerImplementation,
  ConnectionInfo,
} from './types';
import type { ReadableWritablePair } from 'stream/web';
import type { JSONValue } from '../types';
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
import * as rpcEvents from './events';
import * as rpcUtils from './utils/utils';
import * as rpcErrors from './errors';
import * as middlewareUtils from './utils/middleware';
import { never } from '../utils/utils';
import { sysexits } from '../errors';

/**
 * You must provide a error handler `addEventListener('error')`.
 * Otherwise errors will just be ignored.
 *
 * Events:
 * - error
 */
interface RPCServer extends CreateDestroy {}
@CreateDestroy()
class RPCServer extends EventTarget {
  /**
   * Creates RPC server.

   * @param obj
   * @param obj.manifest - Server manifest used to define the rpc method
   * handlers.
   * @param obj.middlewareFactory - Middleware used to process the rpc messages.
   * The middlewareFactory needs to be a function that creates a pair of
   * transform streams that convert `Uint8Array` to `JSONRPCRequest` on the forward
   * path and `JSONRPCResponse` to `Uint8Array` on the reverse path.
   * @param obj.sensitive - If true, sanitises any rpc error messages of any
   * sensitive information.
   * @param obj.logger
   */
  public static async createRPCServer({
    manifest,
    middlewareFactory = middlewareUtils.defaultServerMiddlewareWrapper(),
    sensitive = false,
    logger = new Logger(this.name),
  }: {
    manifest: ServerManifest;
    middlewareFactory?: MiddlewareFactory<
      JSONRPCRequest,
      Uint8Array,
      Uint8Array,
      JSONRPCResponse
    >;
    sensitive?: boolean;
    logger?: Logger;
  }): Promise<RPCServer> {
    logger.info(`Creating ${this.name}`);
    const rpcServer = new this({
      manifest,
      middlewareFactory,
      sensitive,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return rpcServer;
  }

  protected logger: Logger;
  protected handlerMap: Map<string, RawHandlerImplementation> = new Map();
  protected activeStreams: Set<PromiseCancellable<void>> = new Set();
  protected sensitive: boolean;
  protected middlewareFactory: MiddlewareFactory<
    JSONRPCRequest,
    Uint8Array,
    Uint8Array,
    JSONRPCResponseResult
  >;

  public constructor({
    manifest,
    middlewareFactory,
    sensitive,
    logger,
  }: {
    manifest: ServerManifest;
    middlewareFactory: MiddlewareFactory<
      JSONRPCRequest,
      Uint8Array,
      Uint8Array,
      JSONRPCResponseResult
    >;
    sensitive: boolean;
    logger: Logger;
  }) {
    super();
    for (const [key, manifestItem] of Object.entries(manifest)) {
      if (manifestItem instanceof RawHandler) {
        this.registerRawStreamHandler(
          key,
          manifestItem.handle.bind(manifestItem),
        );
        continue;
      }
      if (manifestItem instanceof DuplexHandler) {
        this.registerDuplexStreamHandler(
          key,
          manifestItem.handle.bind(manifestItem),
        );
        continue;
      }
      if (manifestItem instanceof ServerHandler) {
        this.registerServerStreamHandler(
          key,
          manifestItem.handle.bind(manifestItem),
        );
        continue;
      }
      if (manifestItem instanceof ClientHandler) {
        this.registerClientStreamHandler(
          key,
          manifestItem.handle.bind(manifestItem),
        );
        continue;
      }
      if (manifestItem instanceof ClientHandler) {
        this.registerClientStreamHandler(
          key,
          manifestItem.handle.bind(manifestItem),
        );
        continue;
      }
      if (manifestItem instanceof UnaryHandler) {
        this.registerUnaryHandler(key, manifestItem.handle.bind(manifestItem));
        continue;
      }
      never();
    }
    this.middlewareFactory = middlewareFactory;
    this.sensitive = sensitive;
    this.logger = logger;
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    // Stopping any active steams
    for await (const [activeStream] of this.activeStreams.entries()) {
      activeStream.cancel(new rpcErrors.ErrorRPCStopping());
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

  /**
   * Registers a duplex stream handler.
   * This handles all message parsing and conversion from generators
   * to raw streams.
   *
   * @param method - The rpc method name.
   * @param handler - The handler takes an input async iterable and returns an output async iterable.
   */
  protected registerDuplexStreamHandler<
    I extends JSONValue,
    O extends JSONValue,
  >(method: string, handler: DuplexHandlerImplementation<I, O>): void {
    const rawSteamHandler: RawHandlerImplementation = (
      [input, header],
      connectionInfo,
      ctx,
    ) => {
      // Setting up middleware
      const middleware = this.middlewareFactory(header);
      // Forward from the client to the server
      const forwardStream = input.pipeThrough(middleware.forward);
      // Reverse from the server to the client
      const reverseStream = middleware.reverse.writable;
      // Generator derived from handler
      const outputGen = async function* (): AsyncGenerator<JSONRPCResponse> {
        if (ctx.signal.aborted) throw ctx.signal.reason;
        // Input generator derived from the forward stream
        const inputGen = async function* (): AsyncIterable<I> {
          for await (const data of forwardStream) {
            yield data.params as I;
          }
        };
        for await (const response of handler(inputGen(), connectionInfo, ctx)) {
          const responseMessage: JSONRPCResponseResult = {
            jsonrpc: '2.0',
            result: response,
            id: null,
          };
          yield responseMessage;
        }
      };
      const outputGenerator = outputGen();
      let reason: any | undefined = undefined;
      const reverseMiddlewareStream = new ReadableStream<JSONRPCResponse>({
        pull: async (controller) => {
          try {
            const { value, done } = await outputGenerator.next();
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
          } catch (e) {
            if (reason == null) {
              // We want to convert this error to an error message and pass it along
              const rpcError: JSONRPCError = {
                code: e.exitCode ?? sysexits.UNKNOWN,
                message: e.description ?? '',
                data: rpcUtils.fromError(e, this.sensitive),
              };
              const rpcErrorMessage: JSONRPCResponseError = {
                jsonrpc: '2.0',
                error: rpcError,
                id: null,
              };
              controller.enqueue(rpcErrorMessage);
            } else {
              // These errors are emitted to the event system
              // This contains the original error from enqueuing
              this.dispatchEvent(
                new rpcEvents.RPCErrorEvent({
                  detail: new rpcErrors.ErrorRPCSendErrorFailed(undefined, {
                    cause: [e, reason],
                  }),
                }),
              );
            }
            await forwardStream.cancel(
              new rpcErrors.ErrorRPCHandlerFailed('Error clean up'),
            );
            controller.close();
          }
        },
        cancel: async (_reason) => {
          reason = _reason;
          await outputGenerator.throw(_reason);
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
        yield await handler(inputVal, connectionInfo, ctx);
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
      yield await handler(input, connectionInfo, ctx);
    };
    this.registerDuplexStreamHandler(method, wrapperDuplex);
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
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
        rpcUtils.extractFirstMessageTransform(rpcUtils.parseJSONRPCRequest);
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
          new rpcErrors.ErrorRPCHandlerFailed('Missing header'),
        );
        await streamPair.writable.close();
        await inputStreamEndProm;
        return;
      }
      const method = leadingMetadataMessage.method;
      const handler = this.handlerMap.get(method);
      if (handler == null) {
        await inputStream.cancel(
          new rpcErrors.ErrorRPCHandlerFailed('Missing handler'),
        );
        await streamPair.writable.close();
        await inputStreamEndProm;
        return;
      }
      if (abortController.signal.aborted) {
        await inputStream.cancel(
          new rpcErrors.ErrorRPCHandlerFailed('Aborted'),
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
}

export default RPCServer;
