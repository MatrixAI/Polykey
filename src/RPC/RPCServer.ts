import type {
  ServerStreamHandler,
  DuplexStreamHandler,
  JsonRpcError,
  JsonRpcMessage,
  JsonRpcResponseError,
  JsonRpcResponseResult,
  ClientStreamHandler,
} from './types';
import type { ReadableWritablePair } from 'stream/web';
import type { JSONValue, POJO } from '../types';
import type { ConnectionInfo } from '../network/types';
import type { UnaryHandler } from './types';
import { ReadableStream } from 'stream/web';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import Logger from '@matrixai/logger';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import * as rpcErrors from './errors';
import * as rpcUtils from './utils';

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
  private activeStreams: Set<PromiseCancellable<void>> = new Set();
  private events: EventTarget = new EventTarget();

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
    const activeStreams = this.activeStreams;
    for await (const [activeStream] of activeStreams.entries()) {
      activeStream.cancel(new rpcErrors.ErrorRpcStopping());
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
    streamPair: ReadableWritablePair<Buffer, Buffer>,
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
    void handlerProm.finally(() => this.activeStreams.delete(handlerProm));
    // While ReadableStream can be converted to AsyncIterable, we want it as
    //  a generator.
    const inputGen = async function* () {
      const pojoStream = streamPair.readable.pipeThrough(
        new rpcUtils.JsonToJsonMessageStream(rpcUtils.parseJsonRpcRequest),
      );
      for await (const dataMessage of pojoStream) {
        yield dataMessage;
      }
    };
    const container = this.container;
    const handlerMap = this.handlerMap;
    const ctx = { signal: abortController.signal };
    const outputGen = async function* (): AsyncGenerator<JsonRpcMessage> {
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
      // TODO: validation on metadata
      const handler = handlerMap.get(method);
      if (handler == null) {
        // Failed to find handler, this is an error. We should respond with
        // an error message.
        throw new rpcErrors.ErrorRpcHandlerMissing(
          `No handler registered for method: ${method}`,
        );
      }
      if (ctx.signal.aborted) throw ctx.signal.reason;
      try {
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
      } catch (e) {
        // This would be an error from the handler or the streams. We should
        // catch this and send an error message back through the stream.
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
        // TODO: catch this and emit error in the event emitter
        yield rpcErrorMessage;
      }
      resolve();
    };

    const outputGenerator = outputGen();

    const outputStream = new ReadableStream<JsonRpcMessage>({
      pull: async (controller) => {
        const { value, done } = await outputGenerator.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(value);
      },
      cancel: async (reason) => {
        await outputGenerator.throw(reason);
      },
    });
    void outputStream
      .pipeThrough(new rpcUtils.JsonMessageToJsonStream())
      .pipeTo(streamPair.writable);
  }
}

export default RPCServer;
