import type {
  Transformer,
  TransformerFlushCallback,
  TransformerTransformCallback,
  ReadableWritablePair,
} from 'stream/web';
import type { POJO } from '@/types';
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
import type { JsonValue } from 'fast-check';
import { ReadableStream, WritableStream, TransformStream } from 'stream/web';
import { fc } from '@fast-check/jest';
import * as utils from '@/utils';

class BufferStreamToSnipped implements Transformer<Buffer, Buffer> {
  protected buffer = Buffer.alloc(0);
  protected iteration = 0;
  protected snippingPattern: Array<number>;

  constructor(snippingPattern: Array<number>) {
    this.snippingPattern = snippingPattern;
  }

  transform: TransformerTransformCallback<Buffer, Buffer> = async (
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

  flush: TransformerFlushCallback<Buffer> = (controller) => {
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

class BufferStreamToNoisy implements Transformer<Buffer, Buffer> {
  protected iteration = 0;
  protected noise: Array<Buffer>;

  constructor(noise: Array<Buffer>) {
    this.noise = noise;
  }

  transform: TransformerTransformCallback<Buffer, Buffer> = async (
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
  constructor(noise: Array<Buffer>) {
    super(new BufferStreamToNoisy(noise));
  }
}

const jsonRpcStream = (messages: Array<POJO>) => {
  return new ReadableStream<Buffer>({
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
  .map((value) => JSON.parse(JSON.stringify(value)));

const jsonRpcRequestMessageArb = (
  method: fc.Arbitrary<string> = fc.string(),
  params: fc.Arbitrary<JsonValue> = safeJsonValueArb,
) =>
  fc
    .record(
      {
        type: fc.constant('JsonRpcRequest'),
        jsonrpc: fc.constant('2.0'),
        method: method,
        params: params,
        id: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
      },
      {
        requiredKeys: ['type', 'jsonrpc', 'method', 'id'],
      },
    )
    .noShrink() as fc.Arbitrary<JsonRpcRequestMessage>;

const jsonRpcRequestNotificationArb = (
  method: fc.Arbitrary<string> = fc.string(),
  params: fc.Arbitrary<JsonValue> = safeJsonValueArb,
) =>
  fc
    .record(
      {
        type: fc.constant('JsonRpcNotification'),
        jsonrpc: fc.constant('2.0'),
        method: method,
        params: params,
      },
      {
        requiredKeys: ['type', 'jsonrpc', 'method'],
      },
    )
    .noShrink() as fc.Arbitrary<JsonRpcRequestNotification>;

const jsonRpcRequestArb = (
  method: fc.Arbitrary<string> = fc.string(),
  params: fc.Arbitrary<JsonValue> = safeJsonValueArb,
) =>
  fc
    .oneof(
      jsonRpcRequestMessageArb(method, params),
      jsonRpcRequestNotificationArb(method, params),
    )
    .noShrink() as fc.Arbitrary<JsonRpcRequest>;

const jsonRpcResponseResultArb = (
  result: fc.Arbitrary<JsonValue> = safeJsonValueArb,
) =>
  fc
    .record({
      type: fc.constant('JsonRpcResponseResult'),
      jsonrpc: fc.constant('2.0'),
      result: result,
      id: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
    })
    .noShrink() as fc.Arbitrary<JsonRpcResponseResult>;

const jsonRpcErrorArb = fc
  .record(
    {
      code: fc.integer(),
      message: fc.string(),
      data: safeJsonValueArb,
    },
    {
      requiredKeys: ['code', 'message'],
    },
  )
  .noShrink() as fc.Arbitrary<JsonRpcError>;

const jsonRpcResponseErrorArb = fc
  .record({
    type: fc.constant('JsonRpcResponseError'),
    jsonrpc: fc.constant('2.0'),
    error: jsonRpcErrorArb,
    id: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
  })
  .noShrink() as fc.Arbitrary<JsonRpcResponseError>;

const jsonRpcResponseArb = (
  result: fc.Arbitrary<JsonValue> = safeJsonValueArb,
) =>
  fc
    .oneof(jsonRpcResponseResultArb(result), jsonRpcResponseErrorArb)
    .noShrink() as fc.Arbitrary<JsonRpcResponse>;

const jsonRpcMessageArb = (
  method: fc.Arbitrary<string> = fc.string(),
  params: fc.Arbitrary<JsonValue> = safeJsonValueArb,
  result: fc.Arbitrary<JsonValue> = safeJsonValueArb,
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
  streamToArray,
  TapTransformerStream,
  createTapPairs,
};
