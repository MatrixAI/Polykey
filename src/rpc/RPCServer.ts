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
import { ReadableStream, TransformStream } from 'stream/web';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import Logger from '@matrixai/logger';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { Timer } from '@matrixai/timer';
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

const cleanupReason = Symbol('CleanupReason');

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
   * @param obj.streamKeepAliveTimeoutTime - Time before a connection is cleaned up due to no activity. This is the
   * value used if the handler doesn't specify its own timeout time. This timeout is advisory and only results in a
   * signal sent to the handler. Stream is forced to end after the timeoutForceCloseTime. Defaults to 60,000
   * milliseconds.
   * @param obj.timeoutForceCloseTime - Time before the stream is forced to end after the initial timeout time.
   * The stream will be forced to close after this amount of time after the initial timeout. This is a grace period for
   * the handler to handle timeout before it is forced to end. Defaults to 2,000 milliseconds.
   * @param obj.logger
   */
  public static async createRPCServer({
    manifest,
    middlewareFactory = middlewareUtils.defaultServerMiddlewareWrapper(),
    sensitive = false,
    streamKeepAliveTimeoutTime = 60_000, // 1 minute
    timeoutForceCloseTime = 2_000, // 2 seconds
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
    streamKeepAliveTimeoutTime?: number;
    timeoutForceCloseTime?: number;
    logger?: Logger;
  }): Promise<RPCServer> {
    logger.info(`Creating ${this.name}`);
    const rpcServer = new this({
      manifest,
      middlewareFactory,
      sensitive,
      streamKeepAliveTimeoutTime: streamKeepAliveTimeoutTime,
      timeoutForceCloseTime: timeoutForceCloseTime,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return rpcServer;
  }

  protected logger: Logger;
  protected handlerMap: Map<string, RawHandlerImplementation> = new Map();
  protected defaultTimeoutMap: Map<string, number | undefined> = new Map();
  protected streamKeepAliveTimeoutTime: number;
  protected timeoutForceCloseTime: number;
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
    streamKeepAliveTimeoutTime = 60_000, // 1 minuet
    timeoutForceCloseTime = 2_000, // 2 seconds
    logger,
  }: {
    manifest: ServerManifest;
    middlewareFactory: MiddlewareFactory<
      JSONRPCRequest,
      Uint8Array,
      Uint8Array,
      JSONRPCResponseResult
    >;
    streamKeepAliveTimeoutTime?: number;
    timeoutForceCloseTime?: number;
    sensitive: boolean;
    logger: Logger;
  }) {
    super();
    for (const [key, manifestItem] of Object.entries(manifest)) {
      if (manifestItem instanceof RawHandler) {
        this.registerRawStreamHandler(
          key,
          manifestItem.handle.bind(manifestItem),
          manifestItem.timeout,
        );
        continue;
      }
      if (manifestItem instanceof DuplexHandler) {
        this.registerDuplexStreamHandler(
          key,
          manifestItem.handle.bind(manifestItem),
          manifestItem.timeout,
        );
        continue;
      }
      if (manifestItem instanceof ServerHandler) {
        this.registerServerStreamHandler(
          key,
          manifestItem.handle.bind(manifestItem),
          manifestItem.timeout,
        );
        continue;
      }
      if (manifestItem instanceof ClientHandler) {
        this.registerClientStreamHandler(
          key,
          manifestItem.handle.bind(manifestItem),
          manifestItem.timeout,
        );
        continue;
      }
      if (manifestItem instanceof ClientHandler) {
        this.registerClientStreamHandler(
          key,
          manifestItem.handle.bind(manifestItem),
          manifestItem.timeout,
        );
        continue;
      }
      if (manifestItem instanceof UnaryHandler) {
        this.registerUnaryHandler(
          key,
          manifestItem.handle.bind(manifestItem),
          manifestItem.timeout,
        );
        continue;
      }
      never();
    }
    this.middlewareFactory = middlewareFactory;
    this.sensitive = sensitive;
    this.streamKeepAliveTimeoutTime = streamKeepAliveTimeoutTime;
    this.timeoutForceCloseTime = timeoutForceCloseTime;
    this.logger = logger;
  }

  public async destroy(force: boolean = true): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    // Stopping any active steams
    if (force) {
      for await (const [activeStream] of this.activeStreams.entries()) {
        activeStream.cancel(new rpcErrors.ErrorRPCStopping());
      }
    }
    for await (const [activeStream] of this.activeStreams.entries()) {
      await activeStream;
    }
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  protected registerRawStreamHandler(
    method: string,
    handler: RawHandlerImplementation,
    timeout: number | undefined,
  ) {
    this.handlerMap.set(method, handler);
    this.defaultTimeoutMap.set(method, timeout);
  }

  /**
   * Registers a duplex stream handler.
   * This handles all message parsing and conversion from generators
   * to raw streams.
   *
   * @param method - The rpc method name.
   * @param handler - The handler takes an input async iterable and returns an output async iterable.
   * @param timeout
   */
  protected registerDuplexStreamHandler<
    I extends JSONValue,
    O extends JSONValue,
  >(
    method: string,
    handler: DuplexHandlerImplementation<I, O>,
    timeout: number | undefined,
  ): void {
    const rawSteamHandler: RawHandlerImplementation = (
      [header, input],
      connectionInfo,
      ctx,
    ) => {
      // Setting up abort controller
      const abortController = new AbortController();
      if (ctx.signal.aborted) abortController.abort(ctx.signal.reason);
      ctx.signal.addEventListener('abort', () => {
        abortController.abort(ctx.signal.reason);
      });
      const signal = abortController.signal;
      // Setting up middleware
      const middleware = this.middlewareFactory(ctx);
      // Forward from the client to the server
      // Transparent TransformStream that re-inserts the header message into the
      // stream.
      const headerStream = new TransformStream({
        start(controller) {
          controller.enqueue(Buffer.from(JSON.stringify(header)));
        },
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
      });
      const forwardStream = input
        .pipeThrough(headerStream)
        .pipeThrough(middleware.forward);
      // Reverse from the server to the client
      const reverseStream = middleware.reverse.writable;
      // Generator derived from handler
      const outputGen = async function* (): AsyncGenerator<JSONRPCResponse> {
        if (signal.aborted) throw signal.reason;
        // Input generator derived from the forward stream
        const inputGen = async function* (): AsyncIterable<I> {
          for await (const data of forwardStream) {
            ctx.timer.refresh();
            yield data.params as I;
          }
        };
        const handlerG = handler(inputGen(), connectionInfo, {
          signal,
          timer: ctx.timer,
        });
        for await (const response of handlerG) {
          ctx.timer.refresh();
          const responseMessage: JSONRPCResponseResult = {
            jsonrpc: '2.0',
            result: response,
            id: null,
          };
          yield responseMessage;
        }
      };
      const outputGenerator = outputGen();
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
            // Clean up the input stream here, ignore error if already ended
            await forwardStream
              .cancel(new rpcErrors.ErrorRPCHandlerFailed('Error clean up'))
              .catch(() => {});
            controller.close();
          }
        },
        cancel: async (reason) => {
          this.dispatchEvent(
            new rpcEvents.RPCErrorEvent({
              detail: new rpcErrors.ErrorRPCOutputStreamError(
                'Stream has been cancelled',
                {
                  cause: reason,
                },
              ),
            }),
          );
          // Abort with the reason
          abortController.abort(reason);
          // If the output stream path fails then we need to end the generator
          // early.
          await outputGenerator.return(undefined);
        },
      });
      void reverseMiddlewareStream.pipeTo(reverseStream).catch(() => {});
      return middleware.reverse.readable;
    };
    this.registerRawStreamHandler(method, rawSteamHandler, timeout);
  }

  protected registerUnaryHandler<I extends JSONValue, O extends JSONValue>(
    method: string,
    handler: UnaryHandlerImplementation<I, O>,
    timeout: number | undefined,
  ) {
    const wrapperDuplex: DuplexHandlerImplementation<I, O> = async function* (
      input,
      connectionInfo,
      ctx,
    ) {
      // The `input` is expected to be an async iterable with only 1 value.
      // Unlike generators, there is no `next()` method.
      // So we use `break` after the first iteration.
      for await (const inputVal of input) {
        yield await handler(inputVal, connectionInfo, ctx);
        break;
      }
    };
    this.registerDuplexStreamHandler(method, wrapperDuplex, timeout);
  }

  protected registerServerStreamHandler<
    I extends JSONValue,
    O extends JSONValue,
  >(
    method: string,
    handler: ServerHandlerImplementation<I, O>,
    timeout: number | undefined,
  ) {
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
    this.registerDuplexStreamHandler(method, wrapperDuplex, timeout);
  }

  protected registerClientStreamHandler<
    I extends JSONValue,
    O extends JSONValue,
  >(
    method: string,
    handler: ClientHandlerImplementation<I, O>,
    timeout: number | undefined,
  ) {
    const wrapperDuplex: DuplexHandlerImplementation<I, O> = async function* (
      input,
      connectionInfo,
      ctx,
    ) {
      yield await handler(input, connectionInfo, ctx);
    };
    this.registerDuplexStreamHandler(method, wrapperDuplex, timeout);
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
    // This controller will be used to force end the streams directly
    const forceStreamEndController = new AbortController();
    // Setting up timeout timer logic
    const timer = new Timer({
      delay: this.streamKeepAliveTimeoutTime,
      handler: (signal) => {
        abortController.abort(new rpcErrors.ErrorRPCTimedOut());
        if (signal.aborted) return;
        // Grace timer for force ending stream
        const graceTimer = new Timer({
          delay: this.timeoutForceCloseTime,
          handler: () => {
            forceStreamEndController.abort();
          },
        });
        if (signal.aborted) {
          graceTimer.cancel(signal.reason);
          return;
        }
        signal.addEventListener('abort', () => {
          graceTimer.cancel(signal.reason);
        });
      },
    });

    const prom = (async () => {
      const headTransformStream = middlewareUtils.binaryToJsonMessageStream(
        rpcUtils.parseJSONRPCRequest,
      );
      // Transparent transform used as a point to cancel the input stream from
      const passthroughTransform = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const inputStream = passthroughTransform.readable;
      const inputStreamEndProm = streamPair.readable
        .pipeTo(passthroughTransform.writable, {
          signal: forceStreamEndController.signal,
        })
        // Ignore any errors here, we only care that it ended
        .catch(() => {});
      void inputStream
        // Allow us to re-use the readable after reading the first message
        .pipeTo(headTransformStream.writable, {
          preventClose: true,
          preventCancel: true,
        })
        .catch(() => {});
      const cleanUp = async (reason: any) => {
        await inputStream.cancel(reason);
        await streamPair.writable.abort(reason);
        await inputStreamEndProm;
      };
      // Read a single empty value to consume the first message
      const reader = headTransformStream.readable.getReader();
      // Allows timing out when waiting for the first message
      const headerMessage = await Promise.race([
        reader.read(),
        timer.then(() => undefined),
      ]);
      // Downgrade back to the raw stream
      await reader.cancel();
      // There are 2 conditions where we just end here
      //  1. The timeout timer resolves before the first message
      //  2. the stream ends before the first message
      if (headerMessage == null) {
        await cleanUp(
          new rpcErrors.ErrorRPCHandlerFailed('Timed out waiting for header'),
        );
        return;
      }
      if (headerMessage.done) {
        await cleanUp(new rpcErrors.ErrorRPCHandlerFailed('Missing header'));
        return;
      }
      const method = headerMessage.value.method;
      const handler = this.handlerMap.get(method);
      if (handler == null) {
        await cleanUp(new rpcErrors.ErrorRPCHandlerFailed('Missing handler'));
        return;
      }
      if (abortController.signal.aborted) {
        await cleanUp(new rpcErrors.ErrorRPCHandlerFailed('Aborted'));
        return;
      }
      // Setting up Timeout logic
      const timeout = this.defaultTimeoutMap.get(method);
      if (timeout != null && timeout < this.streamKeepAliveTimeoutTime) {
        // Reset timeout with new delay if it is less than the default
        timer.reset(timeout);
      } else {
        // Otherwise refresh
        timer.refresh();
      }
      const outputStream = handler(
        [headerMessage.value, inputStream],
        connectionInfo,
        { signal: abortController.signal, timer },
      );
      const outputStreamEndProm = outputStream
        .pipeTo(streamPair.writable, {
          signal: forceStreamEndController.signal,
        })
        .catch(() => {});
      await Promise.allSettled([inputStreamEndProm, outputStreamEndProm]);
      // Cleaning up abort and timer
      timer.cancel(cleanupReason);
      abortController.abort(new rpcErrors.ErrorRPCStreamEnded());
    })();
    const handlerProm = PromiseCancellable.from(prom, abortController).finally(
      () => this.activeStreams.delete(handlerProm),
      abortController,
    );
    // Putting the PromiseCancellable into the active streams map
    this.activeStreams.add(handlerProm);
  }
}

export default RPCServer;
