import type {
  JsonRpcError,
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcResponseError,
} from '@/rpc/types';
import type { POJO } from '@/types';
import type { JsonRpcNotification, JsonRpcResponseResult } from '@/rpc/types';
import { ReadableStream } from 'stream/web';
import { testProp, fc } from '@fast-check/jest';
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';
import * as rpcUtils from '@/rpc/utils';
import 'ix/add/asynciterable-operators/toarray';
import * as rpcErrors from '@/rpc/errors';
import {
  BufferStreamToNoisyStream,
  BufferStreamToSnippedStream,
} from './utils';

describe('utils tests', () => {
  const jsonRpcStream = (messages: Array<POJO>) => {
    return new ReadableStream<Buffer>({
      async start(controller) {
        for (const arrayElement of messages) {
          // Controller.enqueue(arrayElement)
          controller.enqueue(
            Buffer.from(JSON.stringify(arrayElement), 'utf-8'),
          );
        }
        controller.close();
      },
    });
  };

  const jsonRpcRequestArb = fc
    .record(
      {
        type: fc.constant('JsonRpcRequest'),
        jsonrpc: fc.constant('2.0'),
        method: fc.string(),
        params: fc.object(),
        id: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
      },
      {
        requiredKeys: ['type', 'jsonrpc', 'method', 'id'],
      },
    )
    .noShrink() as fc.Arbitrary<JsonRpcRequest>;

  const jsonRpcNotificationArb = fc
    .record(
      {
        type: fc.constant('JsonRpcNotification'),
        jsonrpc: fc.constant('2.0'),
        method: fc.string(),
        params: fc.object(),
      },
      {
        requiredKeys: ['type', 'jsonrpc', 'method'],
      },
    )
    .noShrink() as fc.Arbitrary<JsonRpcNotification>;

  const jsonRpcResponseResultArb = fc
    .record({
      type: fc.constant('JsonRpcResponseResult'),
      jsonrpc: fc.constant('2.0'),
      result: fc.object(),
      id: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
    })
    .noShrink() as fc.Arbitrary<JsonRpcResponseResult>;

  const jsonRpcErrorArb = fc
    .record(
      {
        code: fc.integer(),
        message: fc.string(),
        data: fc.object(),
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

  const jsonRpcMessageArb = fc
    .oneof(
      jsonRpcRequestArb,
      jsonRpcNotificationArb,
      jsonRpcResponseResultArb,
      jsonRpcResponseErrorArb,
    )
    .noShrink() as fc.Arbitrary<JsonRpcMessage>;

  const snippingPatternArb = fc
    .array(fc.integer({ min: 1, max: 32 }), { minLength: 100, size: 'medium' })
    .noShrink();

  const jsonMessagesArb = fc
    .array(jsonRpcRequestArb, { minLength: 2 })
    .noShrink();

  testProp(
    'can parse json stream',
    [jsonMessagesArb],
    async (messages) => {
      const parsedStream = jsonRpcStream(messages).pipeThrough(
        new rpcUtils.JsonToJsonMessageStream(),
      ); // Converting back.

      const asd = await AsyncIterable.as(parsedStream).toArray();
      expect(asd).toEqual(messages);
    },
    { numRuns: 1000 },
  );

  testProp(
    'can parse json stream with random chunk sizes',
    [jsonMessagesArb, snippingPatternArb],
    async (messages, snippattern) => {
      const parsedStream = jsonRpcStream(messages)
        .pipeThrough(new BufferStreamToSnippedStream(snippattern)) // Imaginary internet here
        .pipeThrough(new rpcUtils.JsonToJsonMessageStream()); // Converting back.

      const asd = await AsyncIterable.as(parsedStream).toArray();
      expect(asd).toStrictEqual(messages);
    },
    { numRuns: 1000 },
  );

  const noiseArb = fc
    .array(
      fc.uint8Array({ minLength: 5 }).map((array) => Buffer.from(array)),
      { minLength: 5 },
    )
    .noShrink();

  testProp(
    'Will error on bad data',
    [jsonMessagesArb, snippingPatternArb, noiseArb],
    async (messages, snippattern, noise) => {
      const parsedStream = jsonRpcStream(messages)
        .pipeThrough(new BufferStreamToSnippedStream(snippattern)) // Imaginary internet here
        .pipeThrough(new BufferStreamToNoisyStream(noise)) // Adding bad data to the stream
        .pipeThrough(new rpcUtils.JsonToJsonMessageStream()); // Converting back.

      await expect(AsyncIterable.as(parsedStream).toArray()).rejects.toThrow(
        rpcErrors.ErrorRpcParse,
      );
    },
    { numRuns: 1000 },
  );

  testProp(
    'can parse messages',
    [jsonRpcMessageArb],
    async (message) => {
      rpcUtils.parseJsonRpcMessage(message);
    },
    { numRuns: 1000 },
  );
});
