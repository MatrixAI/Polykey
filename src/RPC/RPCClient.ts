import type { StreamPairCreateCallback } from './types';
import type { JSONValue, POJO } from 'types';
import type { ReadableWritablePair } from 'stream/web';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  MiddlewareFactory,
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
    // Creating caller side transforms
    const outputMessageTransforStream =
      new rpcUtils.ClientOutputTransformerStream<O>();
    const inputMessageTransformStream =
      new rpcUtils.ClientInputTransformerStream<I>(method);
    let reverseStream = outputMessageTransforStream.writable;
    let forwardStream = inputMessageTransformStream.readable;
    // Setting up middleware chains
    for (const middlewareFactory of this.middleware) {
      const middleware = middlewareFactory();
      forwardStream = forwardStream.pipeThrough(middleware.forward);
      void middleware.reverse.readable.pipeTo(reverseStream).catch(() => {});
      reverseStream = middleware.reverse.writable;
    }
    // Hooking up agnostic stream side
    const streamPair = await this.streamPairCreateCallback();
    void streamPair.readable
      .pipeThrough(
        new rpcUtils.JsonToJsonMessageStream(rpcUtils.parseJsonRpcResponse),
      )
      .pipeTo(reverseStream)
      .catch(() => {});
    void forwardStream
      .pipeThrough(new rpcUtils.JsonMessageToJsonStream())
      .pipeTo(streamPair.writable)
      .catch(() => {});

    // Returning interface
    return {
      readable: outputMessageTransforStream.readable,
      writable: inputMessageTransformStream.writable,
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

  protected middleware: Array<
    MiddlewareFactory<JsonRpcRequest<JSONValue>, JsonRpcResponse<JSONValue>>
  > = [];

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public registerMiddleware(
    middlewareFactory: MiddlewareFactory<
      JsonRpcRequest<JSONValue>,
      JsonRpcResponse<JSONValue>
    >,
  ) {
    this.middleware.push(middlewareFactory);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public clearMiddleware() {
    this.middleware = [];
  }
}

export default RPCClient;
