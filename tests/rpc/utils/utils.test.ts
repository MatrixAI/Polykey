import { testProp } from '@fast-check/jest';
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';
import * as rpcUtils from '@/rpc/utils';
import 'ix/add/asynciterable-operators/toarray';
import * as middleware from '@/rpc/utils/middleware';
import * as rpcTestUtils from '../utils';

describe('utils tests', () => {
  testProp(
    'can parse messages',
    [rpcTestUtils.jsonRpcMessageArb()],
    async (message) => {
      rpcUtils.parseJsonRpcMessage(message);
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
          middleware.binaryToJsonMessageStream(rpcUtils.parseJsonRpcMessage),
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
