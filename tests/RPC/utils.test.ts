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
        .messagesToReadableStream(messages)
        .pipeThrough(
          rpcUtils.binaryToJsonMessageStream(rpcUtils.parseJsonRpcMessage),
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
        .messagesToReadableStream(messages)
        .pipeThrough(rpcTestUtils.binaryStreamToSnippedStream(snippattern)) // Imaginary internet here
        .pipeThrough(
          rpcUtils.binaryToJsonMessageStream(rpcUtils.parseJsonRpcMessage),
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
        .messagesToReadableStream(messages)
        .pipeThrough(rpcTestUtils.binaryStreamToSnippedStream(snippattern)) // Imaginary internet here
        .pipeThrough(rpcTestUtils.binaryStreamToNoisyStream(noise)) // Adding bad data to the stream
        .pipeThrough(
          rpcUtils.binaryToJsonMessageStream(rpcUtils.parseJsonRpcMessage),
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
        .messagesToReadableStream(messages)
        .pipeThrough(rpcTestUtils.binaryStreamToSnippedStream([10]))
        .pipeThrough(
          rpcUtils.binaryToJsonMessageStream(rpcUtils.parseJsonRpcMessage, 50),
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

  testProp(
    'merging transformation stream',
    [fc.array(fc.integer()), fc.array(fc.integer())],
    async (set1, set2) => {
      const [outputResult, outputWriterStream] =
        rpcTestUtils.streamToArray<number>();
      const { controllerP, controllerTransformStream } =
        rpcUtils.controllerTransformationFactory<number>();
      void controllerTransformStream.readable
        .pipeTo(outputWriterStream)
        .catch(() => {});
      const writer = controllerTransformStream.writable.getWriter();
      const controller = await controllerP;
      const expectedResult: Array<number> = [];
      for (let i = 0; i < Math.max(set1.length, set2.length); i++) {
        if (set1[i] != null) {
          await writer.write(set1[i]);
          expectedResult.push(set1[i]);
        }
        if (set2[i] != null) {
          controller.enqueue(set2[i]);
          expectedResult.push(set2[i]);
        }
      }
      await writer.close();

      expect(await outputResult).toStrictEqual(expectedResult);
    },
    { numRuns: 1000 },
  );

  testProp(
    'can get the head message',
    [rpcTestUtils.jsonMessagesArb],
    async (messages) => {
      const { firstMessageProm, headTransformStream } =
        rpcUtils.extractFirstMessageTransform(rpcUtils.parseJsonRpcRequest);
      const parsedStream = rpcTestUtils
        .messagesToReadableStream(messages)
        .pipeThrough(rpcTestUtils.binaryStreamToSnippedStream([7]))
        .pipeThrough(headTransformStream)
        .pipeThrough(
          rpcUtils.binaryToJsonMessageStream(rpcUtils.parseJsonRpcMessage),
        ); // Converting back.

      expect(await firstMessageProm).toStrictEqual(messages[0]);
      expect(await AsyncIterable.as(parsedStream).toArray()).toStrictEqual(
        messages.slice(1),
      );
    },
    { numRuns: 1000 },
  );

  // TODO:
  //  - Test for badly structured data
});
