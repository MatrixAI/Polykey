import type { ReadableWritablePair } from 'stream/web';
import type { JSONValue } from '@/types';
import type {
  JsonRpcRequest,
  JsonRpcRequestMessage,
  JsonRpcResponse,
  ManifestItem,
} from '@/RPC/types';
import { TransformStream, ReadableStream } from 'stream/web';
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

  testProp(
    'raw duplex caller',
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
    const inputStream = rpcTestUtils.jsonRpcStream(messages);
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
    const callerInterface = await rpcClient.duplexStreamCaller<
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
      const inputStream = rpcTestUtils.jsonRpcStream(messages);
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
      const inputStream = rpcTestUtils.jsonRpcStream([message]);
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
      const callerInterface = await rpcClient.clientStreamCaller<
        JSONValue,
        JSONValue
      >(methodName);
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
    [rpcTestUtils.jsonRpcResponseResultArb(), rpcTestUtils.safeJsonValueArb],
    async (message, params) => {
      const inputStream = rpcTestUtils.jsonRpcStream([message]);
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
      const inputStream = rpcTestUtils.jsonRpcStream([
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
      const callerInterface = await rpcClient.duplexStreamCaller<
        JSONValue,
        JSONValue
      >(methodName);
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
  testProp(
    'withRawStreamCaller',
    [
      rpcTestUtils.safeJsonValueArb,
      rpcTestUtils.rawDataArb,
      rpcTestUtils.rawDataArb,
    ],
    async (headerParams, inputData, outputData) => {
      const [inputResult, inputWritableStream] =
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
      const outputResult: Array<Uint8Array> = [];
      await rpcClient.withRawStreamCaller(
        methodName,
        headerParams,
        async function* (output) {
          for await (const outputValue of output) {
            outputResult.push(outputValue);
          }
          for (const inputDatum of inputData) {
            yield inputDatum;
          }
        },
      );
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
      expect(outputResult).toStrictEqual(outputData);
    },
  );
  testProp(
    'withDuplexCaller',
    [fc.array(rpcTestUtils.jsonRpcResponseResultArb(), { minLength: 1 })],
    async (messages) => {
      const inputStream = rpcTestUtils.jsonRpcStream(messages);
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
      await rpcClient.withDuplexCaller(methodName, async function* (output) {
        for await (const value of output) {
          count += 1;
          yield value;
        }
      });
      const result = await outputResult;
      // We're just checking that it consuming the messages as expected
      expect(result.length).toEqual(messages.length);
      expect(count).toEqual(messages.length);
      await rpcClient.destroy();
    },
  );
  testProp(
    'withServerCaller',
    [
      fc.array(rpcTestUtils.jsonRpcResponseResultArb(), { minLength: 1 }),
      rpcTestUtils.safeJsonValueArb,
    ],
    async (messages, params) => {
      const inputStream = rpcTestUtils.jsonRpcStream(messages);
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
      await rpcClient.withServerCaller(methodName, params, async (output) => {
        for await (const _ of output) count += 1;
      });
      const result = await outputResult;
      expect(count).toEqual(messages.length);
      expect(result.toString()).toStrictEqual(
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
    'withClientCaller',
    [
      rpcTestUtils.jsonRpcResponseResultArb(),
      fc.array(rpcTestUtils.safeJsonValueArb, { minLength: 2 }).noShrink(),
    ],
    async (message, inputMessages) => {
      const inputStream = rpcTestUtils.jsonRpcStream([message]);
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
      const result = await rpcClient.withClientCaller(
        methodName,
        async function* () {
          for (const inputMessage of inputMessages) {
            yield inputMessage;
          }
        },
      );
      const expectedResult = inputMessages.map((v) => {
        return JSON.stringify({
          method: methodName,
          jsonrpc: '2.0',
          id: null,
          params: v,
        });
      });
      expect((await outputResult).map((v) => v.toString())).toStrictEqual(
        expectedResult,
      );
      expect(result).toStrictEqual(message.result);
      await rpcClient.destroy();
    },
  );
  testProp(
    'generic duplex caller with forward Middleware',
    [specificMessageArb],
    async (messages) => {
      const inputStream = rpcTestUtils.jsonRpcStream(messages);
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
          forward: new TransformStream<
            JsonRpcRequest<JSONValue>,
            JsonRpcRequest<JSONValue>
          >({
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
      const callerInterface = await rpcClient.duplexStreamCaller<
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
      const inputStream = rpcTestUtils.jsonRpcStream(messages);
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
          reverse: new TransformStream<
            JsonRpcResponse<JSONValue>,
            JsonRpcResponse<JSONValue>
          >({
            transform: (chunk, controller) => {
              controller.enqueue({
                ...chunk,
                result: 'one',
              });
            },
          }),
        };
      });
      const callerInterface = await rpcClient.duplexStreamCaller<
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
    'manifest duplex call',
    [
      fc.array(rpcTestUtils.jsonRpcResponseResultArb(fc.string()), {
        minLength: 5,
      }),
    ],
    async (messages) => {
      const inputStream = rpcTestUtils.jsonRpcStream(messages);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray<string>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const duplex: ManifestItem<string, string> = {
        type: 'DUPLEX',
        handler: async function* (input) {
          yield* input;
        },
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          duplex,
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.methods.duplex();
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
      const inputStream = rpcTestUtils.jsonRpcStream(messages);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray<string>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const server: ManifestItem<string, string> = {
        type: 'SERVER',
        handler: async function* (input) {
          yield* input;
        },
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          server,
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
      const inputStream = rpcTestUtils.jsonRpcStream([message]);
      const [outputResult, outputStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const client: ManifestItem<string, string> = {
        type: 'CLIENT',
        handler: async (_) => {
          return 'hello';
        },
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          client,
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.methods.client();
      const writer = callerInterface.writable.getWriter();
      for (const param of params) {
        await writer.write(param);
      }
      await writer.close();
      expect(await callerInterface.output).toStrictEqual(message.result);
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
      const inputStream = rpcTestUtils.jsonRpcStream([message]);
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const unary: ManifestItem<string, string> = {
        type: 'UNARY',
        handler: async (input) => input,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          unary,
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
      const raw: ManifestItem<JSONValue, JSONValue> = {
        type: 'RAW',
        handler: ([input]) => input,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          raw,
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.methods.raw(headerParams);
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
    'manifest withDuplex caller',
    [
      fc.array(rpcTestUtils.jsonRpcResponseResultArb(fc.string()), {
        minLength: 1,
      }),
    ],
    async (messages) => {
      const inputStream = rpcTestUtils.jsonRpcStream(messages);
      const [outputResult, outputStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const duplex: ManifestItem<string, string> = {
        type: 'DUPLEX',
        handler: async function* (input) {
          yield* input;
        },
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          duplex,
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      let count = 0;
      await rpcClient.withMethods.duplex(async function* (output) {
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
  testProp(
    'manifest withServer caller',
    [
      fc.array(rpcTestUtils.jsonRpcResponseResultArb(), { minLength: 1 }),
      fc.string(),
    ],
    async (messages, params) => {
      const inputStream = rpcTestUtils.jsonRpcStream(messages);
      const [outputResult, outputStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const server: ManifestItem<string, string> = {
        type: 'SERVER',
        handler: async function* (input) {
          yield input;
        },
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          server,
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      let count = 0;
      await rpcClient.withMethods.server(params, async (output) => {
        for await (const _ of output) count += 1;
      });
      const result = await outputResult;
      expect(count).toEqual(messages.length);
      expect(result.toString()).toStrictEqual(
        JSON.stringify({
          method: 'server',
          jsonrpc: '2.0',
          id: null,
          params: params,
        }),
      );
      await rpcClient.destroy();
    },
  );
  testProp(
    'manifest withClient caller',
    [
      rpcTestUtils.jsonRpcResponseResultArb(),
      fc.array(fc.string(), { minLength: 2 }).noShrink(),
    ],
    async (message, inputMessages) => {
      const inputStream = rpcTestUtils.jsonRpcStream([message]);
      const [outputResult, outputStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const streamPair: ReadableWritablePair = {
        readable: inputStream,
        writable: outputStream,
      };
      const client: ManifestItem<string, string> = {
        type: 'CLIENT',
        handler: async (_) => {
          return 'someValue';
        },
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          client,
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const result = await rpcClient.withMethods.client(async function* () {
        for (const inputMessage of inputMessages) {
          yield inputMessage;
        }
      });
      const expectedResult = inputMessages.map((v) => {
        return JSON.stringify({
          method: 'client',
          jsonrpc: '2.0',
          id: null,
          params: v,
        });
      });
      expect((await outputResult).map((v) => v.toString())).toStrictEqual(
        expectedResult,
      );
      expect(result).toStrictEqual(message.result);
      await rpcClient.destroy();
    },
  );
  testProp(
    'manifest withRaw caller',
    [
      rpcTestUtils.safeJsonValueArb,
      rpcTestUtils.rawDataArb,
      rpcTestUtils.rawDataArb,
    ],
    async (headerParams, inputData, outputData) => {
      const [inputResult, inputWritableStream] =
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
      const raw: ManifestItem<JSONValue, JSONValue> = {
        type: 'RAW',
        handler: ([input]) => input,
      };
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          raw,
        },
        streamPairCreateCallback: async () => streamPair,
        logger,
      });
      const outputResult: Array<Uint8Array> = [];
      await rpcClient.withMethods.raw(headerParams, async function* (output) {
        for await (const outputValue of output) {
          outputResult.push(outputValue);
        }
        for (const inputDatum of inputData) {
          yield inputDatum;
        }
      });
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
      expect(outputResult).toStrictEqual(outputData);
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
