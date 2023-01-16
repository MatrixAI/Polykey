import type {
  DuplexCallerInterface,
  ServerCallerInterface,
  ClientCallerInterface,
  JsonRpcRequest,
} from './types';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { JSONValue, POJO } from 'types';
import type { ReadableWritablePair } from 'stream/web';
import { StartStop } from '@matrixai/async-init/dist/StartStop';
import Logger from '@matrixai/logger';
import * as rpcErrors from './errors';
import * as rpcUtils from './utils';

type QuicConnection = {
  // EstablishStream: (stream: ReadableWritablePair) => Promise<void>;
};

interface RPCClient extends StartStop {}
@StartStop()
class RPCClient {
  static async createRPCClient({
    quicConnection,
    logger = new Logger(this.name),
  }: {
    quicConnection: QuicConnection;
    logger: Logger;
  }) {
    logger.info(`Creating ${this.name}`);
    const rpcClient = new this({
      quicConnection,
      logger,
    });
    await rpcClient.start();
    logger.info(`Created ${this.name}`);
    return rpcClient;
  }

  protected logger: Logger;
  protected activeStreams: Set<PromiseCancellable<void>> = new Set();
  protected quicConnection: QuicConnection;

  public constructor({
    quicConnection,
    logger,
  }: {
    quicConnection: QuicConnection;
    logger: Logger;
  }) {
    this.logger = logger;
    this.quicConnection = quicConnection;
  }

  public async start(): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    for await (const [stream] of this.activeStreams.entries()) {
      stream.cancel(new rpcErrors.ErrorRpcStopping());
    }
    for await (const [stream] of this.activeStreams.entries()) {
      await stream;
    }
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async duplexStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    metadata: POJO,
    streamPair: ReadableWritablePair<Buffer, Buffer>,
  ): Promise<DuplexCallerInterface<I, O>> {
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

    const inter: DuplexCallerInterface<I, O> = {
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
    return inter;
  }

  public async serverStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    parameters: I,
    metadata: POJO,
    streamPair: ReadableWritablePair<Buffer, Buffer>,
  ): Promise<ServerCallerInterface<O>> {
    const callerInterface = await this.duplexStreamCaller<I, O>(
      method,
      metadata,
      streamPair,
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

  public async clientStreamCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    metadata: POJO,
    streamPair: ReadableWritablePair<Buffer, Buffer>,
  ): Promise<ClientCallerInterface<I, O>> {
    const callerInterface = await this.duplexStreamCaller<I, O>(
      method,
      metadata,
      streamPair,
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

  public async unaryCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    parameters: I,
    metadata: POJO,
    streamPair: ReadableWritablePair<Buffer, Buffer>,
  ): Promise<O> {
    const callerInterface = await this.duplexStreamCaller<I, O>(
      method,
      metadata,
      streamPair,
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
