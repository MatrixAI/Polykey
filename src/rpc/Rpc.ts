import type {
  ClientStreamHandler,
  DuplexStreamHandler,
  JsonRpcError,
  JsonRpcMessage,
  JsonRpcResponseError,
  JsonRpcResponseResult,
  ServerStreamHandler,
} from './types';
import type { ReadableWritablePair } from 'stream/web';
import type { JSONValue, POJO } from '../types';
import type { ConnectionInfo } from '../network/types';
import type { UnaryHandler } from './types';
import { ReadableStream } from 'stream/web';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import Logger from '@matrixai/logger';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import * as rpcErrors from './errors';
import * as rpcUtils from './utils';
import * as grpcUtils from '../grpc/utils';

// FIXME: Might need to be StartStop. Won't know for sure until it's used.
interface Rpc extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new rpcErrors.ErrorRpcRunning(),
  new rpcErrors.ErrorRpcDestroyed(),
)
class Rpc {
  static async createRpc({
    container,
    logger = new Logger(this.name),
  }: {
    container: POJO;
    logger?: Logger;
  }): Promise<Rpc> {
    logger.info(`Creating ${this.name}`);
    const rpc = new this({
      container,
      logger,
    });
    await rpc.start();
    logger.info(`Created ${this.name}`);
    return rpc;
  }

  // Properties
  protected container: POJO;
  protected logger: Logger;
  protected handlerMap: Map<string, DuplexStreamHandler<JSONValue, JSONValue>> =
    new Map();
  private activeStreams: Set<PromiseCancellable<void>> = new Set();

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

  public async start(): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    // Stopping any active steams
    const activeStreams = this.activeStreams;
    for await (const [activeStream] of activeStreams.entries()) {
      activeStream.cancel(new rpcErrors.ErrorRpcStopping());
    }
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new rpcErrors.ErrorRpcNotRunning())
  public registerDuplexStreamHandler<I extends JSONValue, O extends JSONValue>(
    method: string,
    handler: DuplexStreamHandler<I, O>,
  ) {
    this.handlerMap.set(method, handler);
  }

  @ready(new rpcErrors.ErrorRpcNotRunning())
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
      let count = 0;
      for await (const inputVal of input) {
        if (count > 1) throw new rpcErrors.ErrorRpcProtocal();
        yield handler(inputVal, container, connectionInfo, ctx);
        count += 1;
      }
    };
    this.handlerMap.set(method, wrapperDuplex);
  }

  @ready(new rpcErrors.ErrorRpcNotRunning())
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
      let count = 0;
      for await (const inputVal of input) {
        if (count > 1) throw new rpcErrors.ErrorRpcProtocal();
        yield* handler(inputVal, container, connectionInfo, ctx);
        count += 1;
      }
    };
    this.handlerMap.set(method, wrapperDuplex);
  }

  @ready(new rpcErrors.ErrorRpcNotRunning())
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
      yield handler(input, container, connectionInfo, ctx);
    };
    this.handlerMap.set(method, wrapperDuplex);
  }

  @ready(new rpcErrors.ErrorRpcNotRunning())
  public handleStream(
    streamPair: ReadableWritablePair<Buffer, Buffer>,
    connectionInfo: ConnectionInfo,
  ) {
    // This will take a buffer stream of json messages and set up service
    //  handling for it.
    let resolve: (value: void | PromiseLike<void>) => void;
    const abortController = new AbortController();
    const handlerProm2: PromiseCancellable<void> = new PromiseCancellable(
      (resolve_) => {
        resolve = resolve_;
      },
      abortController,
    );
    this.activeStreams.add(handlerProm2);
    void handlerProm2.finally(() => this.activeStreams.delete(handlerProm2));
    // While ReadableStream can be converted to AsyncIterable, we want it as
    //  a generator.
    const inputGen = async function* () {
      const pojoStream = streamPair.readable.pipeThrough(
        new rpcUtils.JsonToJsonMessageStream(),
      );
      for await (const dataMessage of pojoStream) {
        // Filtering for request and notification messages
        if (
          dataMessage.type === 'JsonRpcRequest' ||
          dataMessage.type === 'JsonRpcNotification'
        ) {
          yield dataMessage;
        }
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
        throw Error('TMP Stream closed early');
      }
      const method = leadingMetadataMessage.value.method;
      const _metadata = leadingMetadataMessage.value.params;
      const dataGen = async function* () {
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
            type: 'JsonRpcResponseResult',
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
          data: grpcUtils.fromError(e),
        };
        const rpcErrorMessage: JsonRpcResponseError = {
          type: 'JsonRpcResponseError',
          jsonrpc: '2.0',
          error: rpcError,
          id: null,
        };
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

export default Rpc;
