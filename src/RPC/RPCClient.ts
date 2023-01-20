import type { StreamPairCreateCallback } from './types';
import type { JSONValue, POJO } from 'types';
import type { ReadableWritablePair } from 'stream/web';
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
    const outputStream = streamPair.readable
      .pipeThrough(
        new rpcUtils.JsonToJsonMessageStream(rpcUtils.parseJsonRpcResponse),
      )
      .pipeThrough(new rpcUtils.ClientOutputTransformerStream<O>());
    const inputMessageTransformer =
      new rpcUtils.ClientInputTransformerStream<I>(method);
    void inputMessageTransformer.readable
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
}

export default RPCClient;
