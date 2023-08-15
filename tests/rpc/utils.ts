import type { ReadableWritablePair } from 'stream/web';
import type { JSONValue } from '@/types';
import type {
  JSONRPCError,
  JSONRPCMessage,
  JSONRPCRequestNotification,
  JSONRPCRequestMessage,
  JSONRPCResponseError,
  JSONRPCResponseResult,
  JSONRPCResponse,
  JSONRPCRequest,
} from '@/rpc/types';
import type { NodeId } from '@/ids';
import { ReadableStream, WritableStream, TransformStream } from 'stream/web';
import { fc } from '@fast-check/jest';
import { IdInternal } from '@matrixai/id';
import * as utils from '@/utils';
import { fromError } from '@/rpc/utils';
import * as rpcErrors from '@/rpc/errors';

/**
 * This is used to convert regular chunks into randomly sized chunks based on
 * a provided pattern. This is to replicate randomness introduced by packets
 * splitting up the data.
 */
function binaryStreamToSnippedStream(snippingPattern: Array<number>) {
  let buffer = Buffer.alloc(0);
  let iteration = 0;
  return new TransformStream<Uint8Array, Uint8Array>({
    transform: (chunk, controller) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (true) {
        const snipAmount = snippingPattern[iteration % snippingPattern.length];
        if (snipAmount > buffer.length) break;
        iteration += 1;
        const returnBuffer = buffer.subarray(0, snipAmount);
        controller.enqueue(returnBuffer);
        buffer = buffer.subarray(snipAmount);
      }
    },
    flush: (controller) => {
      controller.enqueue(buffer);
    },
  });
}

/**
 * This is used to convert regular chunks into randomly sized chunks based on
 * a provided pattern. This is to replicate randomness introduced by packets
 * splitting up the data.
 */
function binaryStreamToNoisyStream(noise: Array<Uint8Array>) {
  let iteration: number = 0;
  return new TransformStream<Uint8Array, Uint8Array>({
    transform: (chunk, controller) => {
      const noiseBuffer = noise[iteration % noise.length];
      const newBuffer = Buffer.from(Buffer.concat([chunk, noiseBuffer]));
      controller.enqueue(newBuffer);
      iteration += 1;
    },
  });
}

/**
 * This takes an array of JSONRPCMessages and converts it to a readable stream.
 * Used to seed input for handlers and output for callers.
 */
const messagesToReadableStream = (messages: Array<JSONRPCMessage>) => {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const arrayElement of messages) {
        controller.enqueue(Buffer.from(JSON.stringify(arrayElement), 'utf-8'));
      }
      controller.close();
    },
  });
};

/**
 * Out RPC data is in form of JSON objects.
 * This creates a JSON object of the type `JSONValue` and will be unchanged by
 * a json stringify and parse cycle.
 */
const safeJsonValueArb = fc
  .json()
  .map((value) => JSON.parse(value.replace('__proto__', 'proto')) as JSONValue);

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
    .noShrink() as fc.Arbitrary<JSONRPCRequestMessage>;

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
    .noShrink() as fc.Arbitrary<JSONRPCRequestNotification>;

const jsonRpcRequestArb = (
  method: fc.Arbitrary<string> = fc.string(),
  params: fc.Arbitrary<JSONValue> = safeJsonValueArb,
) =>
  fc
    .oneof(
      jsonRpcRequestMessageArb(method, params),
      jsonRpcRequestNotificationArb(method, params),
    )
    .noShrink() as fc.Arbitrary<JSONRPCRequest>;

const jsonRpcResponseResultArb = (
  result: fc.Arbitrary<JSONValue> = safeJsonValueArb,
) =>
  fc
    .record({
      jsonrpc: fc.constant('2.0'),
      result: result,
      id: idArb,
    })
    .noShrink() as fc.Arbitrary<JSONRPCResponseResult>;
const jsonRpcErrorArb = (
  error: fc.Arbitrary<Error> = fc.constant(new Error('test error')),
  sensitive: boolean = false,
) =>
  fc
    .record(
      {
        code: fc.integer(),
        message: fc.string(),
        data: error.map((e) => fromError(e, sensitive)),
      },
      {
        requiredKeys: ['code', 'message'],
      },
    )
    .noShrink() as fc.Arbitrary<JSONRPCError>;

const jsonRpcResponseErrorArb = (
  error?: fc.Arbitrary<Error>,
  sensitive: boolean = false,
) =>
  fc
    .record({
      jsonrpc: fc.constant('2.0'),
      error: jsonRpcErrorArb(error, sensitive),
      id: idArb,
    })
    .noShrink() as fc.Arbitrary<JSONRPCResponseError>;

const jsonRpcResponseArb = (
  result: fc.Arbitrary<JSONValue> = safeJsonValueArb,
) =>
  fc
    .oneof(jsonRpcResponseResultArb(result), jsonRpcResponseErrorArb())
    .noShrink() as fc.Arbitrary<JSONRPCResponse>;

const jsonRpcMessageArb = (
  method: fc.Arbitrary<string> = fc.string(),
  params: fc.Arbitrary<JSONValue> = safeJsonValueArb,
  result: fc.Arbitrary<JSONValue> = safeJsonValueArb,
) =>
  fc
    .oneof(jsonRpcRequestArb(method, params), jsonRpcResponseArb(result))
    .noShrink() as fc.Arbitrary<JSONRPCMessage>;

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

type TapCallback<T> = (chunk: T, iteration: number) => Promise<void>;

/**
 * This is used to convert regular chunks into randomly sized chunks based on
 * a provided pattern. This is to replicate randomness introduced by packets
 * splitting up the data.
 */
function tapTransformStream<I>(tapCallback: TapCallback<I> = async () => {}) {
  let iteration: number = 0;
  return new TransformStream<I, I>({
    transform: async (chunk, controller) => {
      try {
        await tapCallback(chunk, iteration);
      } catch (e) {
        // Ignore errors here
      }
      controller.enqueue(chunk);
      iteration += 1;
    },
  });
}

function createTapPairs<A, B>(
  forwardTapCallback: TapCallback<A> = async () => {},
  reverseTapCallback: TapCallback<B> = async () => {},
) {
  const forwardTap = tapTransformStream<A>(forwardTapCallback);
  const reverseTap = tapTransformStream<B>(reverseTapCallback);
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

const errorArb = (
  cause: fc.Arbitrary<Error | undefined> = fc.constant(undefined),
) =>
  cause.chain((cause) =>
    fc.oneof(
      fc.constant(new rpcErrors.ErrorRPCParse(undefined, { cause })),
      fc.constant(new rpcErrors.ErrorRPCMessageLength(undefined, { cause })),
      fc.constant(
        new rpcErrors.ErrorPolykeyRemote(
          {
            command: 'someCommand',
            host: `someHost`,
            nodeId: IdInternal.fromBuffer<NodeId>(Buffer.alloc(32, 0)),
            port: 0,
          },
          undefined,
          {
            cause,
          },
        ),
      ),
    ),
  );

export {
  binaryStreamToSnippedStream,
  binaryStreamToNoisyStream,
  messagesToReadableStream,
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
  tapTransformStream,
  createTapPairs,
  errorArb,
};
