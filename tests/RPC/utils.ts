import type {
  Transformer,
  TransformerFlushCallback,
  TransformerTransformCallback,
  ReadableWritablePair,
} from 'stream/web';
import type { JSONValue, POJO } from '@/types';
import type {
  JsonRpcError,
  JsonRpcMessage,
  JsonRpcRequestNotification,
  JsonRpcRequestMessage,
  JsonRpcResponseError,
  JsonRpcResponseResult,
  JsonRpcResponse,
  JsonRpcRequest,
} from '@/RPC/types';
import { ReadableStream, WritableStream, TransformStream } from 'stream/web';
import { fc } from '@fast-check/jest';
import * as utils from '@/utils';
import { fromError } from '@/RPC/utils';

class BufferStreamToSnipped implements Transformer<Uint8Array, Uint8Array> {
  protected buffer = Buffer.alloc(0);
  protected iteration = 0;
  protected snippingPattern: Array<number>;

  constructor(snippingPattern: Array<number>) {
    this.snippingPattern = snippingPattern;
  }

  transform: TransformerTransformCallback<Uint8Array, Uint8Array> = async (
    chunk,
    controller,
  ) => {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const snipAmount =
        this.snippingPattern[this.iteration % this.snippingPattern.length];
      if (snipAmount > this.buffer.length) break;
      this.iteration += 1;
      const returnBuffer = this.buffer.subarray(0, snipAmount);
      controller.enqueue(returnBuffer);
      this.buffer = this.buffer.subarray(snipAmount);
    }
  };

  flush: TransformerFlushCallback<Uint8Array> = (controller) => {
    controller.enqueue(this.buffer);
  };
}

/**
 * This is used to convert regular chunks into randomly sized chunks based on
 * a provided pattern. This is to replicate randomness introduced by packets
 * splitting up the data.
 */
class BufferStreamToSnippedStream extends TransformStream {
  constructor(snippingPattern: Array<number>) {
    super(new BufferStreamToSnipped(snippingPattern));
  }
}

class BufferStreamToNoisy implements Transformer<Uint8Array, Uint8Array> {
  protected iteration = 0;
  protected noise: Array<Uint8Array>;

  constructor(noise: Array<Uint8Array>) {
    this.noise = noise;
  }

  transform: TransformerTransformCallback<Uint8Array, Uint8Array> = async (
    chunk,
    controller,
  ) => {
    const noiseBuffer = this.noise[this.iteration % this.noise.length];
    const newBuffer = Buffer.from(Buffer.concat([chunk, noiseBuffer]));
    controller.enqueue(newBuffer);
    this.iteration += 1;
  };
}

/**
 * This is used to convert regular chunks into randomly sized chunks based on
 * a provided pattern. This is to replicate randomness introduced by packets
 * splitting up the data.
 */
class BufferStreamToNoisyStream extends TransformStream {
  constructor(noise: Array<Uint8Array>) {
    super(new BufferStreamToNoisy(noise));
  }
}

const jsonRpcStream = (messages: Array<POJO>) => {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const arrayElement of messages) {
        // Controller.enqueue(arrayElement)
        controller.enqueue(Buffer.from(JSON.stringify(arrayElement), 'utf-8'));
      }
      controller.close();
    },
  });
};

const safeJsonValueArb = fc
  .jsonValue()
  .map((value) => JSON.parse(JSON.stringify(value)) as JSONValue);

const idArb = fc.oneof(fc.string(), fc.integer(), fc.constant(null));

const jsonRpcRequestMessageArb = (
  method: fc.Arbitrary<string> = fc.string(),
  params: fc.Arbitrary<JSONValue> = safeJsonValueArb,
) =>
  fc
    .record(
      {
        jsonrpc: fc.constant('2.0'),
        method: method,
        params: params,
        id: idArb,
      },
      {
        requiredKeys: ['jsonrpc', 'method', 'id'],
      },
    )
    .noShrink() as fc.Arbitrary<JsonRpcRequestMessage<JSONValue>>;

const jsonRpcRequestNotificationArb = (
  method: fc.Arbitrary<string> = fc.string(),
  params: fc.Arbitrary<JSONValue> = safeJsonValueArb,
) =>
  fc
    .record(
      {
        jsonrpc: fc.constant('2.0'),
        method: method,
        params: params,
      },
      {
        requiredKeys: ['jsonrpc', 'method'],
      },
    )
    .noShrink() as fc.Arbitrary<JsonRpcRequestNotification>;

const jsonRpcRequestArb = (
  method: fc.Arbitrary<string> = fc.string(),
  params: fc.Arbitrary<JSONValue> = safeJsonValueArb,
) =>
  fc
    .oneof(
      jsonRpcRequestMessageArb(method, params),
      jsonRpcRequestNotificationArb(method, params),
    )
    .noShrink() as fc.Arbitrary<JsonRpcRequest>;

const jsonRpcResponseResultArb = (
  result: fc.Arbitrary<JSONValue> = safeJsonValueArb,
) =>
  fc
    .record({
      jsonrpc: fc.constant('2.0'),
      result: result,
      id: idArb,
    })
    .noShrink() as fc.Arbitrary<JsonRpcResponseResult>;

const jsonRpcErrorArb = (error: Error = new Error('test error')) =>
  fc
    .record(
      {
        code: fc.integer(),
        message: fc.string(),
        data: fc.constant(fromError(error)),
      },
      {
        requiredKeys: ['code', 'message'],
      },
    )
    .noShrink() as fc.Arbitrary<JsonRpcError>;

const jsonRpcResponseErrorArb = (error?: Error) =>
  fc
    .record({
      jsonrpc: fc.constant('2.0'),
      error: jsonRpcErrorArb(error),
      id: idArb,
    })
    .noShrink() as fc.Arbitrary<JsonRpcResponseError>;

const jsonRpcResponseArb = (
  result: fc.Arbitrary<JSONValue> = safeJsonValueArb,
) =>
  fc
    .oneof(jsonRpcResponseResultArb(result), jsonRpcResponseErrorArb())
    .noShrink() as fc.Arbitrary<JsonRpcResponse>;

const jsonRpcMessageArb = (
  method: fc.Arbitrary<string> = fc.string(),
  params: fc.Arbitrary<JSONValue> = safeJsonValueArb,
  result: fc.Arbitrary<JSONValue> = safeJsonValueArb,
) =>
  fc
    .oneof(jsonRpcRequestArb(method, params), jsonRpcResponseArb(result))
    .noShrink() as fc.Arbitrary<JsonRpcMessage>;

const snippingPatternArb = fc
  .array(fc.integer({ min: 1, max: 32 }), { minLength: 100, size: 'medium' })
  .noShrink();

const jsonMessagesArb = fc
  .array(jsonRpcRequestMessageArb(), { minLength: 2 })
  .noShrink();

const rawDataArb = fc.array(fc.uint8Array({ minLength: 1 }), { minLength: 1 });

function streamToArray<T>(): [Promise<Array<T>>, WritableStream<T>] {
  const outputArray: Array<T> = [];
  const result = utils.promise<Array<T>>();
  const outputStream = new WritableStream<T>({
    write: (chunk) => {
      outputArray.push(chunk);
    },
    close: () => {
      result.resolveP(outputArray);
    },
    abort: (reason) => {
      result.rejectP(reason);
    },
  });
  return [result.p, outputStream];
}

class TapTransformer<I> implements Transformer<I, I> {
  protected iteration = 0;

  constructor(
    protected tapCallback: (chunk: I, iteration: number) => Promise<void>,
  ) {}

  transform: TransformerTransformCallback<I, I> = async (chunk, controller) => {
    await this.tapCallback(chunk, this.iteration);
    controller.enqueue(chunk);
    this.iteration += 1;
  };
}

type TapCallback<T> = (chunk: T, iteration: number) => Promise<void>;

/**
 * This is used to convert regular chunks into randomly sized chunks based on
 * a provided pattern. This is to replicate randomness introduced by packets
 * splitting up the data.
 */
class TapTransformerStream<I> extends TransformStream {
  constructor(tapCallback: TapCallback<I> = async () => {}) {
    super(new TapTransformer<I>(tapCallback));
  }
}

function createTapPairs<A, B>(
  forwardTapCallback: TapCallback<A> = async () => {},
  reverseTapCallback: TapCallback<B> = async () => {},
) {
  const forwardTap = new TapTransformerStream<A>(forwardTapCallback);
  const reverseTap = new TapTransformerStream<B>(reverseTapCallback);
  const clientPair: ReadableWritablePair = {
    readable: reverseTap.readable,
    writable: forwardTap.writable,
  };
  const serverPair: ReadableWritablePair = {
    readable: forwardTap.readable,
    writable: reverseTap.writable,
  };
  return {
    clientPair,
    serverPair,
  };
}

export {
  BufferStreamToSnippedStream,
  BufferStreamToNoisyStream,
  jsonRpcStream,
  safeJsonValueArb,
  jsonRpcRequestMessageArb,
  jsonRpcRequestNotificationArb,
  jsonRpcRequestArb,
  jsonRpcResponseResultArb,
  jsonRpcErrorArb,
  jsonRpcResponseErrorArb,
  jsonRpcResponseArb,
  jsonRpcMessageArb,
  snippingPatternArb,
  jsonMessagesArb,
  rawDataArb,
  streamToArray,
  TapTransformerStream,
  createTapPairs,
};
