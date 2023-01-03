import type { JsonRpcRequest } from '@/rpc/types';
import type { POJO } from '@/types';
import { ReadableStream } from 'stream/web';
import { testProp, fc } from '@fast-check/jest';
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';
import { JsonToJsonMessageStream } from '@/rpc/utils';
import 'ix/add/asynciterable-operators/toarray';
import * as rpcErrors from '@/rpc/errors';
import {
  BufferStreamToNoisyStream,
  BufferStreamToSnippedStream,
} from './utils';

const jsonRpcRequestArb = (
  method: fc.Arbitrary<string> = fc.string().map((value) => 'rpc-' + value),
  params: fc.Arbitrary<fc.JsonValue> = fc.jsonValue(),
  requireParams: boolean = false,
) => {
  const requiredKeys: ('jsonrpc' | 'method' | 'params' | 'id')[] = requireParams
    ? ['params', 'jsonrpc', 'method', 'id']
    : ['jsonrpc', 'method', 'id'];
  return fc.record(
    {
      jsonrpc: fc.constant('2.0'),
      method,
      params: params.map((params) => JSON.parse(JSON.stringify(params))),
      id: fc.integer({ min: 0 }),
    },
    {
      requiredKeys,
    },
  ) as fc.Arbitrary<JsonRpcRequest<POJO>>;
};

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

  const snippingPatternArb = fc
    .array(fc.integer({ min: 1, max: 32 }), { minLength: 100, size: 'medium' })
    .noShrink();

  const jsonMessagesArb = fc
    .array(jsonRpcRequestArb(), { minLength: 2 })
    .noShrink();

  testProp(
    'can parse json stream',
    [jsonMessagesArb],
    async (messages) => {
      const parsedStream = jsonRpcStream(messages).pipeThrough(
        new JsonToJsonMessageStream(),
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
        .pipeThrough(new JsonToJsonMessageStream()); // Converting back.

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
        .pipeThrough(new JsonToJsonMessageStream()); // Converting back.

      await expect(AsyncIterable.as(parsedStream).toArray()).rejects.toThrow(
        rpcErrors.ErrorRpcParse,
      );
    },
    { numRuns: 1000 },
  );
});
