import type {
  HandlerType,
  JsonRpcRequestMessage,
  StreamPairCreateCallback,
  ClientManifest,
  MapWithCallers,
} from './types';
import type { JSONValue } from 'types';
import type {
  ReadableWritablePair,
  ReadableStream,
  WritableStream,
} from 'stream/web';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  MiddlewareFactory,
  MapCallers,
} from './types';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import Logger from '@matrixai/logger';
import * as rpcErrors from './errors';
import * as rpcUtils from './utils';

// eslint-disable-next-line
interface RPCClient<M extends ClientManifest> extends CreateDestroy {}
@CreateDestroy()
class RPCClient<M extends ClientManifest> {
  static async createRPCClient<M extends ClientManifest>({
    manifest,
    streamPairCreateCallback,
    logger = new Logger(this.name),
  }: {
    manifest: M;
    streamPairCreateCallback: StreamPairCreateCallback;
    logger: Logger;
  }) {
    logger.info(`Creating ${this.name}`);
    const rpcClient = new this({
      manifest,
      streamPairCreateCallback,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return rpcClient;
  }

  protected logger: Logger;
  protected streamPairCreateCallback: StreamPairCreateCallback;
  protected callerTypes: Record<string, HandlerType>;
  // Method proxies
  public readonly methodsProxy = new Proxy(
    {},
    {
      get: (_, method) => {
        if (typeof method === 'symbol') throw Error('invalid symbol');
        switch (this.callerTypes[method]) {
          case 'DUPLEX':
            return () => this.duplexStreamCaller(method);
          case 'SERVER':
            return (params) => this.serverStreamCaller(method, params);
          case 'CLIENT':
            return () => this.clientStreamCaller(method);
          case 'UNARY':
            return (params) => this.unaryCaller(method, params);
          case 'RAW':
            return (params) => this.rawStreamCaller(method, params);
          default:
            return;
        }
      },
    },
  );
  protected withMethodsProxy = new Proxy(
    {},
    {
      get: (_, method) => {
        if (typeof method === 'symbol') throw Error('invalid symbol');
        switch (this.callerTypes[method]) {
          case 'DUPLEX':
            return (f) => this.withDuplexCaller(method, f);
          case 'SERVER':
            return (params, f) => this.withServerCaller(method, params, f);
          case 'CLIENT':
            return (f) => this.withClientCaller(method, f);
          case 'RAW':
            return (params, f) => this.withRawStreamCaller(method, params, f);
          case 'UNARY':
          default:
            return;
        }
      },
    },
  );

  public constructor({
    manifest,
    streamPairCreateCallback,
    logger,
  }: {
    manifest: M;
    streamPairCreateCallback: StreamPairCreateCallback;
    logger: Logger;
  }) {
    this.callerTypes = rpcUtils.getHandlerTypes(manifest);
    this.streamPairCreateCallback = streamPairCreateCallback;
    this.logger = logger;
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public get methods(): MapCallers<M> {
    return this.methodsProxy as MapCallers<M>;
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public get withMethods(): MapWithCallers<M> {
    return this.withMethodsProxy as MapWithCallers<M>;
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async rawStreamCaller(
    method: string,
    params: JSONValue,
  ): Promise<ReadableWritablePair<Uint8Array, Uint8Array>> {
    const streamPair = await this.streamPairCreateCallback();
    const tempWriter = streamPair.writable.getWriter();
    const header: JsonRpcRequestMessage = {
      jsonrpc: '2.0',
      method,
      params,
      id: null,
    };
    await tempWriter.write(Buffer.from(JSON.stringify(header)));
    tempWriter.releaseLock();
    return streamPair;
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async duplexStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
  ): Promise<ReadableWritablePair<O, I>> {
    // Creating caller side transforms
    const outputMessageTransforStream =
      rpcUtils.clientOutputTransformStream<O>();
    const inputMessageTransformStream =
      rpcUtils.clientInputTransformStream<I>(method);
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
        rpcUtils.binaryToJsonMessageStream(rpcUtils.parseJsonRpcResponse),
      )
      .pipeTo(reverseStream)
      .catch(() => {});
    void forwardStream
      .pipeThrough(rpcUtils.jsonMessageToBinaryStream())
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
  ): Promise<ReadableStream<O>> {
    const callerInterface = await this.duplexStreamCaller<I, O>(method);
    const writer = callerInterface.writable.getWriter();
    await writer.write(parameters);
    await writer.close();

    return callerInterface.readable;
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async clientStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
  ): Promise<{
    output: Promise<O>;
    writable: WritableStream<I>;
  }> {
    const callerInterface = await this.duplexStreamCaller<I, O>(method);
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
  ): Promise<O> {
    const callerInterface = await this.duplexStreamCaller<I, O>(method);
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
  public async withRawStreamCaller(
    method: string,
    params: JSONValue,
    f: (output: AsyncGenerator<Uint8Array>) => AsyncGenerator<Uint8Array>,
  ): Promise<void> {
    const callerInterface = await this.rawStreamCaller(method, params);
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
  public async withDuplexCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    f: (output: AsyncGenerator<O>) => AsyncGenerator<I>,
  ): Promise<void> {
    const callerInterface = await this.duplexStreamCaller<I, O>(method);
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
  ): Promise<void> {
    const callerInterface = await this.serverStreamCaller<I, O>(
      method,
      parameters,
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
  ): Promise<O> {
    const callerInterface = await this.clientStreamCaller<I, O>(method);
    const writer = callerInterface.writable.getWriter();
    for await (const value of f()) {
      await writer.write(value);
    }
    await writer.close();
    return callerInterface.output;
  }

  protected middleware: Array<
    MiddlewareFactory<
      JsonRpcRequest,
      JsonRpcRequest,
      JsonRpcResponse,
      JsonRpcResponse
    >
  > = [];

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public registerMiddleware(
    middlewareFactory: MiddlewareFactory<
      JsonRpcRequest,
      JsonRpcRequest,
      JsonRpcResponse,
      JsonRpcResponse
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
