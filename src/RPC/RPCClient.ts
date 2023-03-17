import type {
  HandlerType,
  JsonRpcRequestMessage,
  StreamPairCreateCallback,
  ClientManifest,
} from './types';
import type { JSONValue } from 'types';
import type {
  ReadableWritablePair,
  WritableStream,
  ReadableStream,
} from 'stream/web';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  MiddlewareFactory,
  MapCallers,
} from './types';
import type { NodeId } from 'ids/index';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import * as middlewareUtils from './middleware';
import * as rpcErrors from './errors';
import * as rpcUtils from './utils';
import {
  clientInputTransformStream,
  clientOutputTransformStream,
} from './utils';
import { never } from '../utils';

// eslint-disable-next-line
interface RPCClient<M extends ClientManifest> extends CreateDestroy {}
@CreateDestroy()
class RPCClient<M extends ClientManifest> {
  static async createRPCClient<M extends ClientManifest>({
    manifest,
    streamPairCreateCallback,
    middleware = middlewareUtils.defaultClientMiddlewareWrapper(),
    logger = new Logger(this.name),
  }: {
    manifest: M;
    streamPairCreateCallback: StreamPairCreateCallback;
    middleware?: MiddlewareFactory<
      Uint8Array,
      JsonRpcRequest,
      JsonRpcResponse,
      Uint8Array
    >;
    logger?: Logger;
  }) {
    logger.info(`Creating ${this.name}`);
    const rpcClient = new this({
      manifest,
      streamPairCreateCallback,
      middleware,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return rpcClient;
  }

  protected logger: Logger;
  protected streamPairCreateCallback: StreamPairCreateCallback;
  protected middleware: MiddlewareFactory<
    Uint8Array,
    JsonRpcRequest,
    JsonRpcResponse,
    Uint8Array
  >;
  protected callerTypes: Record<string, HandlerType>;
  // Method proxies
  public readonly methodsProxy = new Proxy(
    {},
    {
      get: (_, method) => {
        if (typeof method === 'symbol') throw never();
        switch (this.callerTypes[method]) {
          case 'UNARY':
            return (params) => this.unaryCaller(method, params);
          case 'SERVER':
            return (params) => this.serverStreamCaller(method, params);
          case 'CLIENT':
            return () => this.clientStreamCaller(method);
          case 'DUPLEX':
            return () => this.duplexStreamCaller(method);
          case 'RAW':
            return (header) => this.rawStreamCaller(method, header);
          default:
            return;
        }
      },
    },
  );

  public constructor({
    manifest,
    streamPairCreateCallback,
    middleware,
    logger,
  }: {
    manifest: M;
    streamPairCreateCallback: StreamPairCreateCallback;
    middleware: MiddlewareFactory<
      Uint8Array,
      JsonRpcRequest,
      JsonRpcResponse,
      Uint8Array
    >;
    logger: Logger;
  }) {
    this.callerTypes = rpcUtils.getHandlerTypes(manifest);
    this.streamPairCreateCallback = streamPairCreateCallback;
    this.middleware = middleware;
    this.logger = logger;
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
  public get methods(): MapCallers<M> {
    return this.methodsProxy as MapCallers<M>;
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
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
      throw new rpcErrors.ErrorRPCMissingResponse();
    }
    await reader.cancel();
    await writer.close();
    return output.value;
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
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

  @ready(new rpcErrors.ErrorRPCDestroyed())
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
        throw new rpcErrors.ErrorRPCMissingResponse();
      }
      return value;
    });
    return {
      output,
      writable: callerInterface.writable,
    };
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
  public async duplexStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
  ): Promise<ReadableWritablePair<O, I>> {
    // Providing empty metadata here. we don't support it yet.
    const outputMessageTransformStream = clientOutputTransformStream<O>({
      nodeId: IdInternal.fromBuffer<NodeId>(Buffer.alloc(32, 0)), // FIXME
      host: '',
      port: 0,
      command: method,
    });
    const inputMessageTransformStream = clientInputTransformStream<I>(method);
    const middleware = this.middleware();
    // Hooking up agnostic stream side
    const streamPair = await this.streamPairCreateCallback();
    void streamPair.readable
      .pipeThrough(middleware.reverse)
      .pipeTo(outputMessageTransformStream.writable)
      .catch(() => {});
    void inputMessageTransformStream.readable
      .pipeThrough(middleware.forward)
      .pipeTo(streamPair.writable)
      .catch(() => {});

    // Returning interface
    return {
      readable: outputMessageTransformStream.readable,
      writable: inputMessageTransformStream.writable,
    };
  }

  @ready(new rpcErrors.ErrorRPCDestroyed())
  public async rawStreamCaller(
    method: string,
    headerParams: JSONValue,
  ): Promise<ReadableWritablePair<Uint8Array, Uint8Array>> {
    const streamPair = await this.streamPairCreateCallback();
    const tempWriter = streamPair.writable.getWriter();
    const header: JsonRpcRequestMessage = {
      jsonrpc: '2.0',
      method,
      params: headerParams,
      id: null,
    };
    await tempWriter.write(Buffer.from(JSON.stringify(header)));
    tempWriter.releaseLock();
    return streamPair;
  }
}

export default RPCClient;
