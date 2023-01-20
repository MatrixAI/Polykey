import type {
  ClientCallerInterface,
  DuplexCallerInterface,
  JsonRpcRequestMessage,
  ServerCallerInterface,
  StreamPairCreateCallback,
} from './types';
import type { JSONValue, POJO } from 'types';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import Logger from '@matrixai/logger';
import * as rpcErrors from './errors';
import * as rpcUtils from './utils';
import { promise } from '../utils/index';

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
    // Constructing the PromiseCancellable for tracking the active stream
    const inputFinishedProm = promise<void>();
    const outputFinishedProm = promise<void>();
    const abortController = new AbortController();
    const handlerProm: PromiseCancellable<void> = new PromiseCancellable<void>(
      (resolve) => {
        Promise.all([inputFinishedProm.p, outputFinishedProm.p]).finally(() =>
          resolve(),
        );
      },
      abortController,
    );
    // Putting the PromiseCancellable into the active streams map
    this.activeStreams.add(handlerProm);
    void handlerProm
      .finally(() => this.activeStreams.delete(handlerProm))
      .catch(() => {});

    const streamPair = await this.streamPairCreateCallback();
    const inputStream = streamPair.readable.pipeThrough(
      new rpcUtils.JsonToJsonMessageStream(rpcUtils.parseJsonRpcResponse),
    );
    const outputTransform = new rpcUtils.JsonMessageToJsonStream();
    void outputTransform.readable.pipeTo(streamPair.writable).catch(() => {});

    const inputGen = async function* (): AsyncGenerator<void, void, I> {
      const writer = outputTransform.writable.getWriter();
      let value: I;
      try {
        while (true) {
          value = yield;
          const message: JsonRpcRequestMessage<I> = {
            method,
            jsonrpc: '2.0',
            id: null,
            params: value,
          };
          await writer.write(message);
        }
      } finally {
        await writer.close();
        inputFinishedProm.resolveP();
      }
    };

    const outputGen = async function* (): AsyncGenerator<O, void, never> {
      try {
        for await (const result of inputStream) {
          if ('error' in result) {
            throw rpcUtils.toError(result.error.data);
          }
          yield result.result as O;
        }
      } finally {
        outputFinishedProm.resolveP();
      }
    };
    const output = outputGen();
    const input = inputGen();
    // Initiating the input generator
    await input.next();
    // Hooking up abort signals
    abortController.signal.addEventListener('abort', async () => {
      await output.throw(abortController.signal.reason);
      await input.throw(abortController.signal.reason);
    });
    // Returning interface
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
        await input.return();
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
        if (done) {
          throw new rpcErrors.ErrorRpcRemoteError(
            'Stream ended before response',
          );
        }
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
    if (output.done) {
      throw new rpcErrors.ErrorRpcRemoteError('Stream ended before response');
    }
    await callerInterface.end();
    await callerInterface.close();
    return output.value;
  }
}

export default RPCClient;
