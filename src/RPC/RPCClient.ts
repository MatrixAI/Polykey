import type {
  ClientCallerInterface,
  DuplexCallerInterface,
  JsonRpcRequest,
  ServerCallerInterface,
  StreamPairCreateCallback,
} from './types';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { JSONValue, POJO } from 'types';
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
  protected activeStreams: Set<PromiseCancellable<void>> = new Set();
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
    for await (const [stream] of this.activeStreams.entries()) {
      stream.cancel(new rpcErrors.ErrorRpcStopping());
    }
    for await (const [stream] of this.activeStreams.entries()) {
      await stream;
    }
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async duplexStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    _metadata: POJO,
  ): Promise<DuplexCallerInterface<I, O>> {
    const streamPair = await this.streamPairCreateCallback();
    const inputStream = streamPair.readable.pipeThrough(
      new rpcUtils.JsonToJsonMessageStream(),
    );
    const outputTransform = new rpcUtils.JsonMessageToJsonStream();
    void outputTransform.readable.pipeTo(streamPair.writable);

    const inputGen = async function* (): AsyncGenerator<void, void, I> {
      const writer = outputTransform.writable.getWriter();
      let value: I;
      try {
        while (true) {
          value = yield;
          const message: JsonRpcRequest<I> = {
            method,
            type: 'JsonRpcRequest',
            jsonrpc: '2.0',
            id: null,
            params: value,
          };
          await writer.write(message);
        }
      } catch (e) {
        await writer.abort(e);
      } finally {
        await writer.close();
      }
    };

    const outputGen = async function* (): AsyncGenerator<O, void, never> {
      const reader = inputStream.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (
          value?.type === 'JsonRpcRequest' ||
          value?.type === 'JsonRpcNotification'
        ) {
          yield value.params as O;
        }
      }
    };
    const output = outputGen();
    const input = inputGen();
    // Initiating the input generator
    await input.next();

    return {
      read: () => output.next(),
      write: async (value: I) => {
        await input.next(value);
      },
      inputGenerator: input,
      outputGenerator: output,
      end: async () => {
        await input.return();
      },
      close: async () => {
        await output.return();
      },
      throw: async (reason: any) => {
        await input.throw(reason);
        await output.throw(reason);
      },
    };
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async serverStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    parameters: I,
    metadata: POJO,
  ): Promise<ServerCallerInterface<O>> {
    const callerInterface = await this.duplexStreamCaller<I, O>(
      method,
      metadata,
    );
    await callerInterface.write(parameters);
    await callerInterface.end();

    return {
      read: () => callerInterface.read(),
      outputGenerator: callerInterface.outputGenerator,
      close: () => callerInterface.close(),
      throw: async (reason: any) => {
        await callerInterface.outputGenerator.throw(reason);
      },
    };
  }

  @ready(new rpcErrors.ErrorRpcDestroyed())
  public async clientStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    metadata: POJO,
  ): Promise<ClientCallerInterface<I, O>> {
    const callerInterface = await this.duplexStreamCaller<I, O>(
      method,
      metadata,
    );
    const output = callerInterface
      .read()
      .then(({ value, done }) => {
        if (done) throw Error('TMP Stream closed early');
        return value;
      })
      .finally(async () => {
        await callerInterface.close();
      });
    return {
      write: (value: I) => callerInterface.write(value),
      result: output,
      inputGenerator: callerInterface.inputGenerator,
      end: () => callerInterface.end(),
      throw: (reason: any) => callerInterface.throw(reason),
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
    await callerInterface.write(parameters);
    const output = await callerInterface.read();
    if (output.done) throw Error('TMP stream ended early');
    await callerInterface.end();
    await callerInterface.close();
    return output.value;
  }
}

export default RPCClient;
