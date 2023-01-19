import { testProp, fc } from '@fast-check/jest';
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';
import * as rpcUtils from '@/RPC/utils';
import 'ix/add/asynciterable-operators/toarray';
import * as rpcErrors from '@/RPC/errors';
import * as rpcTestUtils from './utils';

describe('utils tests', () => {
  testProp(
    'can parse json stream',
    [rpcTestUtils.jsonMessagesArb],
    async (messages) => {
      const parsedStream = rpcTestUtils
        .jsonRpcStream(messages)
        .pipeThrough(
          new rpcUtils.JsonToJsonMessageStream(rpcUtils.parseJsonRpcMessage),
        ); // Converting back.

      const asd = await AsyncIterable.as(parsedStream).toArray();
      expect(asd).toEqual(messages);
    },
    { numRuns: 1000 },
  );

  testProp(
    'can parse json stream with random chunk sizes',
    [rpcTestUtils.jsonMessagesArb, rpcTestUtils.snippingPatternArb],
    async (messages, snippattern) => {
      const parsedStream = rpcTestUtils
        .jsonRpcStream(messages)
        .pipeThrough(new rpcTestUtils.BufferStreamToSnippedStream(snippattern)) // Imaginary internet here
        .pipeThrough(
          new rpcUtils.JsonToJsonMessageStream(rpcUtils.parseJsonRpcMessage),
        ); // Converting back.

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
    [rpcTestUtils.jsonMessagesArb, rpcTestUtils.snippingPatternArb, noiseArb],
    async (messages, snippattern, noise) => {
      const parsedStream = rpcTestUtils
        .jsonRpcStream(messages)
        .pipeThrough(new rpcTestUtils.BufferStreamToSnippedStream(snippattern)) // Imaginary internet here
        .pipeThrough(new rpcTestUtils.BufferStreamToNoisyStream(noise)) // Adding bad data to the stream
        .pipeThrough(
          new rpcUtils.JsonToJsonMessageStream(rpcUtils.parseJsonRpcMessage),
        ); // Converting back.

      await expect(AsyncIterable.as(parsedStream).toArray()).rejects.toThrow(
        rpcErrors.ErrorRpcParse,
      );
    },
    { numRuns: 1000 },
  );

  testProp(
    'can parse messages',
    [rpcTestUtils.jsonRpcMessageArb()],
    async (message) => {
      rpcUtils.parseJsonRpcMessage(message);
    },
    { numRuns: 1000 },
  );

  testProp(
    'Message size limit is enforced',
    [
      fc.array(
        rpcTestUtils.jsonRpcRequestMessageArb(fc.string({ minLength: 100 })),
        {
          minLength: 1,
        },
      ),
    ],
    async (messages) => {
      const parsedStream = rpcTestUtils
        .jsonRpcStream(messages)
        .pipeThrough(new rpcTestUtils.BufferStreamToSnippedStream([10]))
        .pipeThrough(
          new rpcUtils.JsonToJsonMessageStream(
            rpcUtils.parseJsonRpcMessage,
            50,
          ),
        );

      const doThing = async () => {
        for await (const _ of parsedStream) {
          // No touch, only consume
        }
      };
      await expect(doThing()).rejects.toThrow(rpcErrors.ErrorRpcMessageLength);
    },
    { numRuns: 1000 },
  );

  // TODO:
  //  - Test for badly structured data
});
