import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { JSONValue, POJO } from 'types';
import type {
  ReadableWritablePair,
  ReadableStream,
  WritableStream,
} from 'stream/web';
import { StartStop } from '@matrixai/async-init/dist/StartStop';
import * as rpcErrors from 'RPC/errors';
import Logger from '@matrixai/logger';

type QuicConnection = {
  establishStream: (stream: ReadableWritablePair) => Promise<void>;
};

interface RPCServer extends StartStop {}
@StartStop()
class RPCServer {
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

  protected duplexCaller<I extends JSONValue, O extends JSONValue>(
    method: string,
    metadata: POJO,
  ): AsyncGenerator<O, any, I> {
    // The stream pair is the interface with the quic system. The readable is
    //  considered the output while the writeable is the input to the caller.
    const pair: ReadableWritablePair<O, I> = {
      readable: {} as ReadableStream<O>,
      writable: {} as WritableStream<I>,
    };

    const inputGen = async function* (): AsyncGenerator<void, void, I | null> {
      const writer = pair.writable.getWriter();
      let value: I | null;
      try {
        while (true) {
          value = yield;
          if (value === null) break;
          await writer.write(value);
        }
        await writer.close();
      } catch (e) {
        await writer.abort(e);
      }
    };

    const outputGen = async function* (): AsyncGenerator<O, void, never> {
      const reader = pair.readable.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        yield value;
      }
    };
    const output = outputGen();
    const input = inputGen();

    const inter = {
      read: () => output.next(),
      write: (value: I | null) => input.next(value),
    };

    const duplexGenerator = async function* (): AsyncGenerator<O, any, I> {
      const otherThing: O = {} as O;
      const thing = yield otherThing;
    };
    return duplexGenerator();
  }
}
