import type { ReadableWritablePair } from 'stream/web';
import type { JSONValue } from '@/types';
import type {
  JsonRpcRequest,
  JsonRpcRequestMessage,
  JsonRpcResponse,
} from '@/RPC/types';
import { TransformStream, ReadableStream } from 'stream/web';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { testProp, fc } from '@fast-check/jest';
import RPCClient from '@/RPC/RPCClient';
import RPCServer from '@/RPC/RPCServer';
import * as rpcErrors from '@/RPC/errors';
import {
  ClientCaller,
  DuplexCaller,
  RawCaller,
  ServerCaller,
  UnaryCaller,
} from '@/RPC/callers';
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

  testProp(
    'raw caller',
    [
      rpcTestUtils.safeJsonValueArb,
      rpcTestUtils.rawDataArb,
      rpcTestUtils.rawDataArb,
    ],
    async (headerParams, inputData, outputData) => {
      const [inputResult, inputWritableStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const [outputResult, outputWritableStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair<Uint8Array, Uint8Array> = {
        readable: new ReadableStream<Uint8Array>({
          start: (controller) => {
            for (const datum of outputData) {
              controller.enqueue(datum);
            }
            controller.close();
          },
        }),
        writable: inputWritableStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.rawStreamCaller(
        'testMethod',
        headerParams,
      );
      await callerInterface.readable.pipeTo(outputWritableStream);
      const writer = callerInterface.writable.getWriter();
      for (const inputDatum of inputData) {
        await writer.write(inputDatum);
      }
      await writer.close();

      const expectedHeader: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: methodName,
        params: headerParams,
        id: null,
      };
      expect(await inputResult).toStrictEqual([
        Buffer.from(JSON.stringify(expectedHeader)),
        ...inputData,
      ]);
      expect(await outputResult).toStrictEqual(outputData);
    },
  );
  testProp('generic duplex caller', [specificMessageArb], async (messages) => {
    const inputStream = rpcTestUtils.messagesToReadableStream(messages);
    const [outputResult, outputStream] =
      rpcTestUtils.streamToArray<Uint8Array>();
    const streamPair: ReadableWritablePair = {
      readable: inputStream,
      writable: outputStream,
    };
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {},
      streamPairCreateCallback: async () => streamPair,
      logger,
    });
    await rpcClient.duplexStreamCaller<JSONValue, JSONValue>(
      methodName,
      async function* (output) {
        yield* output;
      },
    );

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
    [specificMessageArb, rpcTestUtils.safeJsonValueArb],
    async (messages, params) => {
      const inputStream = rpcTestUtils.messagesToReadableStream(messages);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.serverStreamCaller<
        JSONValue,
        JSONValue
      >(methodName, params as JSONValue);
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
    [
      rpcTestUtils.jsonRpcResponseResultArb(),
      fc.array(rpcTestUtils.safeJsonValueArb),
    ],
    async (message, params) => {
      const inputStream = rpcTestUtils.messagesToReadableStream([message]);
      const [outputResult, outputStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      await rpcClient.clientStreamCaller<JSONValue, JSONValue>(
        methodName,
        async function* (output) {
          for (const param of params) {
            yield param;
          }
          yield undefined;
          expect(await output).toStrictEqual(message.result);
        },
      );
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
    [rpcTestUtils.jsonRpcResponseResultArb(), rpcTestUtils.safeJsonValueArb],
    async (message, params) => {
      const inputStream = rpcTestUtils.messagesToReadableStream([message]);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const result = await rpcClient.unaryCaller<JSONValue, JSONValue>(
        methodName,
        params as JSONValue,
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
      const inputStream = rpcTestUtils.messagesToReadableStream([
        ...messages,
        errorMessage,
      ]);
      const [outputResult, outputStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callProm = rpcClient.duplexStreamCaller<JSONValue, JSONValue>(
        methodName,
        async function* (output) {
          for await (const _ of output) {
            // No touch, just consume
          }
        },
      );
      await expect(callProm).rejects.toThrow(rpcErrors.ErrorRpcRemoteError);
      await outputResult;
      await rpcClient.destroy();
    },
  );
  testProp(
    'rawDuplexStreamCaller',
    [fc.array(rpcTestUtils.jsonRpcResponseResultArb(), { minLength: 1 })],
    async (messages) => {
      const inputStream = rpcTestUtils.messagesToReadableStream(messages);
      const [outputResult, outputStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      let count = 0;
      const callerInterface = await rpcClient.rawDuplexStreamCaller(methodName);
      const writer = callerInterface.writable.getWriter();
      for await (const val of callerInterface.readable) {
        count += 1;
        await writer.write(val);
      }
      await writer.close();
      const result = await outputResult;
      // We're just checking that it's consuming the messages as expected
      expect(result.length).toEqual(messages.length);
      expect(count).toEqual(messages.length);
      await rpcClient.destroy();
    },
  );
  testProp(
    'generic duplex caller with forward Middleware',
    [specificMessageArb],
    async (messages) => {
      const inputStream = rpcTestUtils.messagesToReadableStream(messages);
      const [outputResult, outputStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => streamPair,
        logger,
      });

      rpcClient.registerMiddleware(() => {
        return {
          forward: new TransformStream<JsonRpcRequest, JsonRpcRequest>({
            transform: (chunk, controller) => {
              controller.enqueue({
                ...chunk,
                params: 'one',
              });
            },
          }),
          reverse: new TransformStream(),
        };
      });
      const callerInterface = await rpcClient.rawDuplexStreamCaller<
        JSONValue,
        JSONValue
      >(methodName);
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

      const expectedMessages: Array<JsonRpcRequestMessage> = messages.map(
        () => {
          const request: JsonRpcRequestMessage = {
            jsonrpc: '2.0',
            method: methodName,
            id: null,
            params: 'one',
          };
          return request;
        },
      );
      const outputMessages = (await outputResult).map((v) =>
        JSON.parse(v.toString()),
      );
      expect(outputMessages).toStrictEqual(expectedMessages);
      await rpcClient.destroy();
    },
  );
  testProp(
    'generic duplex caller with reverse Middleware',
    [specificMessageArb],
    async (messages) => {
      const inputStream = rpcTestUtils.messagesToReadableStream(messages);
      const [outputResult, outputStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => streamPair,
        logger,
      });

      rpcClient.registerMiddleware(() => {
        return {
          forward: new TransformStream(),
          reverse: new TransformStream<JsonRpcResponse, JsonRpcResponse>({
            transform: (chunk, controller) => {
              controller.enqueue({
                ...chunk,
                result: 'one',
              });
            },
          }),
        };
      });
      const callerInterface = await rpcClient.rawDuplexStreamCaller<
        JSONValue,
        JSONValue
      >(methodName);
      const reader = callerInterface.readable.getReader();
      const writer = callerInterface.writable.getWriter();
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // We have to end the writer otherwise the stream never closes
          await writer.close();
          break;
        }
        expect(value).toBe('one');
        await writer.write(value);
      }
      await outputResult;
      await rpcClient.destroy();
    },
  );
  testProp(
    'manifest raw duplex call',
    [
      fc.array(rpcTestUtils.jsonRpcResponseResultArb(fc.string()), {
        minLength: 5,
      }),
    ],
    async (messages) => {
      const inputStream = rpcTestUtils.messagesToReadableStream(messages);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray<string>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          duplex: new DuplexCaller<string, string>(),
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.rawMethods.duplex();
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
      const expectedMessages: Array<JsonRpcRequestMessage> = messages.map(
        (v) => {
          const request: JsonRpcRequestMessage = {
            jsonrpc: '2.0',
            method: 'duplex',
            id: null,
            ...(v.result === undefined ? {} : { params: v.result }),
          };
          return request;
        },
      );
      const outputMessages = (await outputResult).map((v) =>
        JSON.parse(v.toString()),
      );
      expect(outputMessages).toStrictEqual(expectedMessages);

      await rpcClient.destroy();
    },
  );
  testProp(
    'manifest server call',
    [specificMessageArb, fc.string()],
    async (messages, params) => {
      const inputStream = rpcTestUtils.messagesToReadableStream(messages);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray<string>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          server: new ServerCaller<string, string>(),
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.methods.server(params);
      const values: Array<JSONValue> = [];
      for await (const value of callerInterface) {
        values.push(value);
      }
      const expectedValues = messages.map((v) => v.result);
      expect(values).toStrictEqual(expectedValues);
      expect((await outputResult)[0]?.toString()).toStrictEqual(
        JSON.stringify({
          method: 'server',
          jsonrpc: '2.0',
          id: null,
          params,
        }),
      );
      await rpcClient.destroy();
    },
  );
  testProp(
    'manifest client call',
    [
      rpcTestUtils.jsonRpcResponseResultArb(fc.string()),
      fc.array(fc.string(), { minLength: 5 }),
    ],
    async (message, params) => {
      const inputStream = rpcTestUtils.messagesToReadableStream([message]);
      const [outputResult, outputStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          client: new ClientCaller<string, string>(),
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      await rpcClient.methods.client(async function* (output) {
        for (const param of params) {
          yield param;
        }
        yield undefined;
        expect(await output).toStrictEqual(message.result);
      });
      const expectedOutput = params.map((v) =>
        JSON.stringify({
          method: 'client',
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
    'manifest unary call',
    [rpcTestUtils.jsonRpcResponseResultArb().noShrink(), fc.string()],
    async (message, params) => {
      const inputStream = rpcTestUtils.messagesToReadableStream([message]);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          unary: new UnaryCaller<string, string>(),
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const result = await rpcClient.methods.unary(params);
      expect(result).toStrictEqual(message.result);
      expect((await outputResult)[0]?.toString()).toStrictEqual(
        JSON.stringify({
          method: 'unary',
          jsonrpc: '2.0',
          id: null,
          params: params,
        }),
      );
      await rpcClient.destroy();
    },
  );
  testProp(
    'manifest raw duplex caller',
    [
      rpcTestUtils.safeJsonValueArb,
      rpcTestUtils.rawDataArb,
      rpcTestUtils.rawDataArb,
    ],
    async (headerParams, inputData, outputData) => {
      const [inputResult, inputWritableStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const [outputResult, outputWritableStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair<Uint8Array, Uint8Array> = {
        readable: new ReadableStream<Uint8Array>({
          start: (controller) => {
            for (const datum of outputData) {
              controller.enqueue(datum);
            }
            controller.close();
          },
        }),
        writable: inputWritableStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          raw: new RawCaller(),
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.rawMethods.raw(headerParams);
      await callerInterface.readable.pipeTo(outputWritableStream);
      const writer = callerInterface.writable.getWriter();
      for (const inputDatum of inputData) {
        await writer.write(inputDatum);
      }
      await writer.close();

      const expectedHeader: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'raw',
        params: headerParams,
        id: null,
      };
      expect(await inputResult).toStrictEqual([
        Buffer.from(JSON.stringify(expectedHeader)),
        ...inputData,
      ]);
      expect(await outputResult).toStrictEqual(outputData);
    },
  );
  testProp(
    'manifest duplex caller',
    [
      fc.array(rpcTestUtils.jsonRpcResponseResultArb(fc.string()), {
        minLength: 1,
      }),
    ],
    async (messages) => {
      const inputStream = rpcTestUtils.messagesToReadableStream(messages);
      const [outputResult, outputStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          duplex: new DuplexCaller<string, string>(),
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      let count = 0;
      await rpcClient.methods.duplex(async function* (output) {
        for await (const value of output) {
          count += 1;
          yield value;
        }
      });
      const result = await outputResult;
      // We're just checking that it's consuming the messages as expected
      expect(result.length).toEqual(messages.length);
      expect(count).toEqual(messages.length);
      await rpcClient.destroy();
    },
  );
  test('manifest without handler errors', async () => {
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {},
      streamPairCreateCallback: async () => {
        return {} as ReadableWritablePair;
      },
      logger,
    });
    // @ts-ignore: ignoring type safety here
    expect(() => rpcClient.methods.someMethod()).toThrow();
    // @ts-ignore: ignoring type safety here
    expect(() => rpcClient.withMethods.someMethod()).toThrow();
    await rpcClient.destroy();
  });
});
