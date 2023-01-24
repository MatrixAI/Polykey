import type {
  ClientStreamHandler,
  DuplexStreamHandler,
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcResponseError,
  JsonRpcResponseResult,
  ServerStreamHandler,
  UnaryHandler,
} from './types';
import type { ReadableWritablePair } from 'stream/web';
import type { JSONValue, POJO } from '../types';
import type { ConnectionInfo } from '../network/types';
import type { RPCErrorEvent } from './utils';
import type {
  MiddlewareFactory,
  MiddlewareShort,
  Middleware,
} from 'tokens/types';
import { ReadableStream } from 'stream/web';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import Logger from '@matrixai/logger';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import * as rpcUtils from './utils';
import * as rpcErrors from './errors';

interface RPCServer extends CreateDestroy {}
@CreateDestroy()
class RPCServer {
  static async createRPCServer({
    container,
    logger = new Logger(this.name),
  }: {
    container: POJO;
    logger?: Logger;
  }): Promise<RPCServer> {
    logger.info(`Creating ${this.name}`);
    const rpcServer = new this({
      container,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return rpcServer;
  }

  // Properties
  protected container: POJO;
  protected logger: Logger;
  protected handlerMap: Map<string, DuplexStreamHandler<JSONValue, JSONValue>> =
    new Map();
  protected activeStreams: Set<PromiseCancellable<void>> = new Set();
  protected events: EventTarget = new EventTarget();

  public constructor({
    container,
    logger,
  }: {
    container: POJO;
    logger: Logger;
  }) {
    this.container = container;
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

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public registerDuplexStreamHandler<I extends JSONValue, O extends JSONValue>(
    method: string,
    handler: DuplexStreamHandler<I, O>,
  ) {
    this.handlerMap.set(method, handler);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public registerUnaryHandler<I extends JSONValue, O extends JSONValue>(
    method: string,
    handler: UnaryHandler<I, O>,
  ) {
    const wrapperDuplex: DuplexStreamHandler<I, O> = async function* (
      input,
      container,
      connectionInfo,
      ctx,
    ) {
      for await (const inputVal of input) {
        yield handler(inputVal, container, connectionInfo, ctx);
        break;
      }
    };
    this.handlerMap.set(method, wrapperDuplex);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public registerServerStreamHandler<I extends JSONValue, O extends JSONValue>(
    method: string,
    handler: ServerStreamHandler<I, O>,
  ) {
    const wrapperDuplex: DuplexStreamHandler<I, O> = async function* (
      input,
      container,
      connectionInfo,
      ctx,
    ) {
      for await (const inputVal of input) {
        yield* handler(inputVal, container, connectionInfo, ctx);
        break;
      }
    };
    this.handlerMap.set(method, wrapperDuplex);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public registerClientStreamHandler<I extends JSONValue, O extends JSONValue>(
    method: string,
    handler: ClientStreamHandler<I, O>,
  ) {
    const wrapperDuplex: DuplexStreamHandler<I, O> = async function* (
      input,
      container,
      connectionInfo,
      ctx,
    ) {
      yield handler(input, container, connectionInfo, ctx);
    };
    this.handlerMap.set(method, wrapperDuplex);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public handleStream(
    streamPair: ReadableWritablePair<Uint8Array, Uint8Array>,
    connectionInfo: ConnectionInfo,
  ) {
    // This will take a buffer stream of json messages and set up service
    //  handling for it.
    // Constructing the PromiseCancellable for tracking the active stream
    let resolve: (value: void | PromiseLike<void>) => void;
    const abortController = new AbortController();
    const handlerProm: PromiseCancellable<void> = new PromiseCancellable(
      (resolve_) => {
        resolve = resolve_;
      },
      abortController,
    );
    // Putting the PromiseCancellable into the active streams map
    this.activeStreams.add(handlerProm);
    void handlerProm
      .finally(() => this.activeStreams.delete(handlerProm))
      .catch(() => {});
    // Setting up forward middleware
    let middlewareStream = streamPair.readable.pipeThrough(
      new rpcUtils.JsonToJsonMessageStream(rpcUtils.parseJsonRpcRequest),
    );
    const shortMessageQueue: Array<JsonRpcResponse> = [];
    for (const forwardMiddleWareFactory of this.forwardMiddleWare) {
      const middleware = forwardMiddleWareFactory();
      middlewareStream = middleware(
        middlewareStream,
        (value: JsonRpcResponse) => shortMessageQueue.push(value),
      );
    }
    // While ReadableStream can be converted to AsyncIterable, we want it as
    //  a generator.
    const inputGen = async function* () {
      for await (const dataMessage of middlewareStream) {
        yield dataMessage;
      }
    };
    const container = this.container;
    const handlerMap = this.handlerMap;
    const ctx = { signal: abortController.signal };
    const events = this.events;
    const outputGen = async function* (): AsyncGenerator<
      JsonRpcResponse<JSONValue>
    > {
      // Step 1, authentication and establishment
      // read the first message, lets assume the first message is always leading
      //  metadata.
      const input = inputGen();
      if (ctx.signal.aborted) throw ctx.signal.reason;
      const leadingMetadataMessage = await input.next();
      if (leadingMetadataMessage.done === true) {
        throw new rpcErrors.ErrorRpcProtocal('Stream ended before response');
      }
      const method = leadingMetadataMessage.value.method;
      const initialParams = leadingMetadataMessage.value.params;
      const dataGen = async function* () {
        yield initialParams as JSONValue;
        for await (const data of input) {
          yield data.params as JSONValue;
        }
      };
      const handler = handlerMap.get(method);
      if (handler == null) {
        // Failed to find handler, this is an error. We should respond with
        // an error message.
        throw new rpcErrors.ErrorRpcHandlerMissing(
          `No handler registered for method: ${method}`,
        );
      }
      if (ctx.signal.aborted) throw ctx.signal.reason;
      for await (const response of handler(
        dataGen(),
        container,
        connectionInfo,
        ctx,
      )) {
        const responseMessage: JsonRpcResponseResult<JSONValue> = {
          jsonrpc: '2.0',
          result: response,
          id: null,
        };
        yield responseMessage;
      }
    };

    const outputGenerator = outputGen();

    let reverseMiddlewareStream = new ReadableStream<
      JsonRpcResponse<JSONValue>
    >({
      pull: async (controller) => {
        try {
          const { value, done } = await outputGenerator.next();
          if (done) {
            controller.close();
            resolve();
            return;
          }
          controller.enqueue(value);
        } catch (e) {
          if (rpcUtils.isReturnableError(e)) {
            // We want to convert this error to an error message and pass it along
            const rpcError: JsonRpcError = {
              code: e.exitCode,
              message: e.description,
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
          controller.close();
          resolve();
        }
      },
      cancel: async (reason) => {
        await outputGenerator.throw(reason);
      },
    });
    // Setting up reverse middleware
    for (const reverseMiddleWareFactory of this.reverseMiddleware) {
      const middleware = reverseMiddleWareFactory();
      reverseMiddlewareStream = middleware(reverseMiddlewareStream);
    }
    reverseMiddlewareStream
      .pipeThrough(new rpcUtils.QueueMergingTransformStream(shortMessageQueue))
      .pipeThrough(new rpcUtils.JsonMessageToJsonStream())
      .pipeTo(streamPair.writable)
      .catch(() => {});
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

  protected forwardMiddleWare: Array<
    MiddlewareFactory<
      MiddlewareShort<JsonRpcRequest<JSONValue>, JsonRpcResponse<JSONValue>>
    >
  > = [];
  protected reverseMiddleware: Array<
    MiddlewareFactory<Middleware<JsonRpcResponse<JSONValue>>>
  > = [];

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public registerForwardMiddleware(
    middlewareFactory: MiddlewareFactory<
      MiddlewareShort<JsonRpcRequest<JSONValue>, JsonRpcResponse<JSONValue>>
    >,
  ) {
    this.forwardMiddleWare.push(middlewareFactory);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public clearForwardMiddleware() {
    this.reverseMiddleware = [];
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public registerReverseMiddleware(
    middlewareFactory: MiddlewareFactory<
      Middleware<JsonRpcResponse<JSONValue>>
    >,
  ) {
    this.reverseMiddleware.push(middlewareFactory);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public clearReverseMiddleware() {
    this.reverseMiddleware = [];
  }
}

export default RPCServer;
