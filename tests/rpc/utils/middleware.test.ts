import { fc, testProp } from '@fast-check/jest';
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';
import * as rpcUtils from '@/rpc/utils';
import 'ix/add/asynciterable-operators/toarray';
import * as rpcErrors from '@/rpc/errors';
import * as middleware from '@/rpc/utils/middleware';
import * as rpcTestUtils from '../utils';

describe('Middleware tests', () => {
  const noiseArb = fc
    .array(
      fc.uint8Array({ minLength: 5 }).map((array) => Buffer.from(array)),
      { minLength: 5 },
    )
    .noShrink();

  testProp(
    'can parse json stream',
    [rpcTestUtils.jsonMessagesArb],
    async (messages) => {
      const parsedStream = rpcTestUtils
        .messagesToReadableStream(messages)
        .pipeThrough(
          middleware.binaryToJsonMessageStream(rpcUtils.parseJSONRPCMessage),
        ); // Converting back.

      const asd = await AsyncIterable.as(parsedStream).toArray();
      expect(asd).toEqual(messages);
    },
    { numRuns: 1000 },
  );
  testProp(
    'Message size limit is enforced when parsing',
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
        .messagesToReadableStream(messages)
        .pipeThrough(rpcTestUtils.binaryStreamToSnippedStream([10]))
        .pipeThrough(
          middleware.binaryToJsonMessageStream(
            rpcUtils.parseJSONRPCMessage,
            50,
          ),
        );

      const doThing = async () => {
        for await (const _ of parsedStream) {
          // No touch, only consume
        }
      };
      await expect(doThing()).rejects.toThrow(rpcErrors.ErrorRPCMessageLength);
    },
    { numRuns: 1000 },
  );
  testProp(
    'can parse json stream with random chunk sizes',
    [rpcTestUtils.jsonMessagesArb, rpcTestUtils.snippingPatternArb],
    async (messages, snippattern) => {
      const parsedStream = rpcTestUtils
        .messagesToReadableStream(messages)
        .pipeThrough(rpcTestUtils.binaryStreamToSnippedStream(snippattern)) // Imaginary internet here
        .pipeThrough(
          middleware.binaryToJsonMessageStream(rpcUtils.parseJSONRPCMessage),
        ); // Converting back.

      const asd = await AsyncIterable.as(parsedStream).toArray();
      expect(asd).toStrictEqual(messages);
    },
    { numRuns: 1000 },
  );
  testProp(
    'Will error on bad data',
    [rpcTestUtils.jsonMessagesArb, rpcTestUtils.snippingPatternArb, noiseArb],
    async (messages, snippattern, noise) => {
      const parsedStream = rpcTestUtils
        .messagesToReadableStream(messages)
        .pipeThrough(rpcTestUtils.binaryStreamToSnippedStream(snippattern)) // Imaginary internet here
        .pipeThrough(rpcTestUtils.binaryStreamToNoisyStream(noise)) // Adding bad data to the stream
        .pipeThrough(
          middleware.binaryToJsonMessageStream(rpcUtils.parseJSONRPCMessage),
        ); // Converting back.

      await expect(AsyncIterable.as(parsedStream).toArray()).rejects.toThrow(
        rpcErrors.ErrorRPCParse,
      );
    },
    { numRuns: 1000 },
  );
});
