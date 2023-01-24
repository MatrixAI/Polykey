import type { StreamPairCreateCallback } from './types';
import type { JSONValue, POJO } from 'types';
import type { ReadableWritablePair } from 'stream/web';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  MiddlewareFactory,
  Middleware,
} from './types';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import Logger from '@matrixai/logger';
import * as rpcErrors from './errors';
import * as rpcUtils from './utils';

interface RPCClient extends CreateDestroy {}
@CreateDestroy()
class RPCClient {
  static async createRPCClient({
    streamPairCreateCallback,
    logger = new Logger(this.name),
  }: {
    streamPairCreateCallback: StreamPairCreateCallback;
    logger: Logger;
  }) {
    logger.info(`Creating ${this.name}`);
    const rpcClient = new this({
      streamPairCreateCallback,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return rpcClient;
  }

  protected logger: Logger;
  protected streamPairCreateCallback: StreamPairCreateCallback;

  public constructor({
    streamPairCreateCallback,
    logger,
  }: {
    streamPairCreateCallback: StreamPairCreateCallback;
    logger: Logger;
  }) {
    this.logger = logger;
    this.streamPairCreateCallback = streamPairCreateCallback;
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async duplexStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    _metadata: POJO,
  ): Promise<ReadableWritablePair<O, I>> {
    const streamPair = await this.streamPairCreateCallback();
    let reverseMiddlewareStream = streamPair.readable.pipeThrough(
      new rpcUtils.JsonToJsonMessageStream(rpcUtils.parseJsonRpcResponse),
    );
    for (const middleWare of this.reverseMiddleware) {
      const middle = middleWare();
      reverseMiddlewareStream = middle(reverseMiddlewareStream);
    }
    const outputStream = reverseMiddlewareStream.pipeThrough(
      new rpcUtils.ClientOutputTransformerStream<O>(),
    );
    const inputMessageTransformer =
      new rpcUtils.ClientInputTransformerStream<I>(method);
    let forwardMiddlewareStream = inputMessageTransformer.readable;
    for (const middleware of this.forwardMiddleWare) {
      const middle = middleware();
      forwardMiddlewareStream = middle(forwardMiddlewareStream);
    }
    void forwardMiddlewareStream
      .pipeThrough(new rpcUtils.JsonMessageToJsonStream())
      .pipeTo(streamPair.writable)
      .catch(() => {});
    const inputStream = inputMessageTransformer.writable;

    // Returning interface
    return {
      readable: outputStream,
      writable: inputStream,
    };
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async serverStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    parameters: I,
    metadata: POJO,
  ) {
    const callerInterface = await this.duplexStreamCaller<I, O>(
      method,
      metadata,
    );
    const writer = callerInterface.writable.getWriter();
    await writer.write(parameters);
    await writer.close();

    return callerInterface.readable;
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async clientStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    metadata: POJO,
  ) {
    const callerInterface = await this.duplexStreamCaller<I, O>(
      method,
      metadata,
    );
    const reader = callerInterface.readable.getReader();
    const output = reader.read().then(({ value, done }) => {
      if (done) {
        throw new rpcErrors.ErrorRpcRemoteError('Stream ended before response');
      }
      return value;
    });
    return {
      output,
      writable: callerInterface.writable,
    };
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async unaryCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    parameters: I,
    metadata: POJO,
  ): Promise<O> {
    const callerInterface = await this.duplexStreamCaller<I, O>(
      method,
      metadata,
    );
    const reader = callerInterface.readable.getReader();
    const writer = callerInterface.writable.getWriter();
    await writer.write(parameters);
    const output = await reader.read();
    if (output.done) {
      throw new rpcErrors.ErrorRpcRemoteError('Stream ended before response');
    }
    await reader.cancel();
    await writer.close();
    return output.value;
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async withDuplexCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    f: (output: AsyncGenerator<O>) => AsyncGenerator<I>,
    metadata: POJO,
  ): Promise<void> {
    const callerInterface = await this.duplexStreamCaller<I, O>(
      method,
      metadata,
    );
    const outputGenerator = async function* () {
      for await (const value of callerInterface.readable) {
        yield value;
      }
    };
    const writer = callerInterface.writable.getWriter();
    for await (const value of f(outputGenerator())) {
      await writer.write(value);
    }
    await writer.close();
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async withServerCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    parameters: I,
    f: (output: AsyncGenerator<O>) => Promise<void>,
    metadata: POJO,
  ) {
    const callerInterface = await this.serverStreamCaller<I, O>(
      method,
      parameters,
      metadata,
    );
    const outputGenerator = async function* () {
      yield* callerInterface;
    };
    await f(outputGenerator());
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async withClientCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    f: () => AsyncGenerator<I>,
    metadata: POJO,
  ): Promise<O> {
    const callerInterface = await this.clientStreamCaller<I, O>(
      method,
      metadata,
    );
    const writer = callerInterface.writable.getWriter();
    for await (const value of f()) {
      await writer.write(value);
    }
    await writer.close();
    return callerInterface.output;
  }

  protected forwardMiddleWare: Array<
    MiddlewareFactory<Middleware<JsonRpcRequest<JSONValue>>>
  > = [];
  protected reverseMiddleware: Array<
    MiddlewareFactory<Middleware<JsonRpcResponse<JSONValue>>>
  > = [];

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public registerForwardMiddleware(
    middlewareFactory: MiddlewareFactory<Middleware<JsonRpcRequest<JSONValue>>>,
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

export default RPCClient;
