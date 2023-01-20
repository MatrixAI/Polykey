import type { ReadableWritablePair } from 'stream/web';
import type { JSONValue } from '@/types';
import type { JsonRpcRequestMessage } from '@/RPC/types';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { testProp, fc } from '@fast-check/jest';
import RPCClient from '@/RPC/RPCClient';
import RPCServer from '@/RPC/RPCServer';
import * as rpcErrors from '@/RPC/errors';
import * as rpcTestUtils from './utils';

describe(`${RPCClient.name}`, () => {
  const logger = new Logger(`${RPCServer.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);

  const methodName = 'testMethod';
  const specificMessageArb = fc
    .array(rpcTestUtils.jsonRpcResponseResultArb(), {
      minLength: 5,
    })
    .noShrink();

  testProp('generic duplex caller', [specificMessageArb], async (messages) => {
    const inputStream = rpcTestUtils.jsonRpcStream(messages);
    const [outputResult, outputStream] = rpcTestUtils.streamToArray<Buffer>();
    const streamPair: ReadableWritablePair = {
      readable: inputStream,
      writable: outputStream,
    };
    const rpcClient = await RPCClient.createRPCClient({
      streamPairCreateCallback: async () => streamPair,
      logger,
    });
    const callerInterface = await rpcClient.duplexStreamCaller<
      JSONValue,
      JSONValue
    >(methodName, { hello: 'world' });
    const reader = callerInterface.readable.getReader();
    const writer = callerInterface.writable.getWriter();
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        // We have to end the writer otherwise the stream never closes
        await writer.close();
        break;
      }
      await writer.write(value);
    }
    const expectedMessages: Array<JsonRpcRequestMessage> = messages.map((v) => {
      const request: JsonRpcRequestMessage = {
        jsonrpc: '2.0',
        method: methodName,
        id: null,
        ...(v.result === undefined ? {} : { params: v.result }),
      };
      return request;
    });
    const outputMessages = (await outputResult).map((v) =>
      JSON.parse(v.toString()),
    );
    expect(outputMessages).toStrictEqual(expectedMessages);
    await rpcClient.destroy();
  });
  testProp(
    'generic server stream caller',
    [specificMessageArb, fc.jsonValue()],
    async (messages, params) => {
      const inputStream = rpcTestUtils.jsonRpcStream(messages);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.serverStreamCaller<
        JSONValue,
        JSONValue
      >(methodName, params as JSONValue, {});
      const values: Array<JSONValue> = [];
      for await (const value of callerInterface) {
        values.push(value);
      }
      const expectedValues = messages.map((v) => v.result);
      expect(values).toStrictEqual(expectedValues);
      expect((await outputResult)[0]?.toString()).toStrictEqual(
        JSON.stringify({
          method: methodName,
          jsonrpc: '2.0',
          id: null,
          params,
        }),
      );
      await rpcClient.destroy();
    },
  );
  testProp(
    'generic client stream caller',
    [rpcTestUtils.jsonRpcResponseResultArb(), fc.array(fc.jsonValue())],
    async (message, params) => {
      const inputStream = rpcTestUtils.jsonRpcStream([message]);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray<Buffer>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.clientStreamCaller<
        JSONValue,
        JSONValue
      >(methodName, {});
      const writer = callerInterface.writable.getWriter();
      for (const param of params) {
        await writer.write(param as JSONValue);
      }
      await writer.close();
      expect(await callerInterface.output).toStrictEqual(message.result);
      const expectedOutput = params.map((v) =>
        JSON.stringify({
          method: methodName,
          jsonrpc: '2.0',
          id: null,
          params: v,
        }),
      );
      expect((await outputResult).map((v) => v.toString())).toStrictEqual(
        expectedOutput,
      );
      await rpcClient.destroy();
    },
  );
  testProp(
    'generic unary caller',
    [rpcTestUtils.jsonRpcResponseResultArb(), fc.jsonValue()],
    async (message, params) => {
      const inputStream = rpcTestUtils.jsonRpcStream([message]);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const result = await rpcClient.unaryCaller<JSONValue, JSONValue>(
        methodName,
        params as JSONValue,
        {},
      );
      expect(result).toStrictEqual(message.result);
      expect((await outputResult)[0]?.toString()).toStrictEqual(
        JSON.stringify({
          method: methodName,
          jsonrpc: '2.0',
          id: null,
          params: params,
        }),
      );
      await rpcClient.destroy();
    },
  );
  testProp(
    'generic duplex caller can throw received error message',
    [
      fc.array(rpcTestUtils.jsonRpcResponseResultArb()),
      rpcTestUtils.jsonRpcResponseErrorArb(),
    ],
    async (messages, errorMessage) => {
      const inputStream = rpcTestUtils.jsonRpcStream([
        ...messages,
        errorMessage,
      ]);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray<Buffer>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.duplexStreamCaller<
        JSONValue,
        JSONValue
      >(methodName, { hello: 'world' });
      const consumeToError = async () => {
        for await (const _ of callerInterface.readable) {
          // No touch, just consume
        }
      };
      await expect(consumeToError()).rejects.toThrow(
        rpcErrors.ErrorRpcRemoteError,
      );
      await callerInterface.writable.close();
      await outputResult;
      await rpcClient.destroy();
    },
  );
});
