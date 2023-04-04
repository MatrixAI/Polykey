import type { ReadableWritablePair } from 'stream/web';
import type { JSONValue } from '@/types';
import type {
  JSONRPCRequest,
  JSONRPCRequestMessage,
  JSONRPCResponse,
} from '@/rpc/types';
import type { ContextTimed } from '@/contexts/types';
import { TransformStream, ReadableStream } from 'stream/web';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { testProp, fc } from '@fast-check/jest';
import { Timer } from '@matrixai/timer';
import RPCClient from '@/rpc/RPCClient';
import RPCServer from '@/rpc/RPCServer';
import * as rpcErrors from '@/rpc/errors';
import {
  ClientCaller,
  DuplexCaller,
  RawCaller,
  ServerCaller,
  UnaryCaller,
} from '@/rpc/callers';
import * as middlewareUtils from '@/rpc/utils/middleware';
import { promise, sleep } from '@/utils/index';
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
        streamFactory: async () => streamPair,
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

      const expectedHeader: JSONRPCRequest = {
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
      streamFactory: async () => streamPair,
      logger,
    });
    const callerInterface = await rpcClient.duplexStreamCaller<
      JSONValue,
      JSONValue
    >(methodName);
    const writable = callerInterface.writable.getWriter();
    for await (const value of callerInterface.readable) {
      await writable.write(value);
    }
    await writable.close();

    const expectedMessages: Array<JSONRPCRequestMessage> = messages.map((v) => {
      const request: JSONRPCRequestMessage = {
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
        streamFactory: async () => streamPair,
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
        streamFactory: async () => streamPair,
        logger,
      });
      const { output, writable } = await rpcClient.clientStreamCaller<
        JSONValue,
        JSONValue
      >(methodName);
      const writer = writable.getWriter();
      for (const param of params) {
        await writer.write(param);
      }
      await writer.close();
      expect(await output).toStrictEqual(message.result);
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
        streamFactory: async () => streamPair,
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
      rpcTestUtils.jsonRpcResponseErrorArb(rpcTestUtils.errorArb()),
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
        streamFactory: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.duplexStreamCaller<
        JSONValue,
        JSONValue
      >(methodName);
      await callerInterface.writable.close();
      const callProm = (async () => {
        for await (const _ of callerInterface.readable) {
          // Only consume
        }
      })();
      await expect(callProm).rejects.toThrow(rpcErrors.ErrorPolykeyRemote);
      await outputResult;
      await rpcClient.destroy();
    },
  );
  testProp(
    'generic duplex caller can throw received error message with sensitive',
    [
      fc.array(rpcTestUtils.jsonRpcResponseResultArb()),
      rpcTestUtils.jsonRpcResponseErrorArb(rpcTestUtils.errorArb(), true),
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
        streamFactory: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.duplexStreamCaller<
        JSONValue,
        JSONValue
      >(methodName);
      await callerInterface.writable.close();
      const callProm = (async () => {
        for await (const _ of callerInterface.readable) {
          // Only consume
        }
      })();
      await expect(callProm).rejects.toThrow(rpcErrors.ErrorPolykeyRemote);
      await outputResult;
      await rpcClient.destroy();
    },
  );
  testProp(
    'generic duplex caller can throw received error message with causes',
    [
      fc.array(rpcTestUtils.jsonRpcResponseResultArb()),
      rpcTestUtils.jsonRpcResponseErrorArb(
        rpcTestUtils.errorArb(rpcTestUtils.errorArb()),
        true,
      ),
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
        streamFactory: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.duplexStreamCaller<
        JSONValue,
        JSONValue
      >(methodName);
      await callerInterface.writable.close();
      const callProm = (async () => {
        for await (const _ of callerInterface.readable) {
          // Only consume
        }
      })();
      await expect(callProm).rejects.toThrow(rpcErrors.ErrorPolykeyRemote);
      await outputResult;
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
        streamFactory: async () => streamPair,
        middlewareFactory: middlewareUtils.defaultClientMiddlewareWrapper(
          () => {
            return {
              forward: new TransformStream<JSONRPCRequest, JSONRPCRequest>({
                transform: (chunk, controller) => {
                  controller.enqueue({
                    ...chunk,
                    params: 'one',
                  });
                },
              }),
              reverse: new TransformStream(),
            };
          },
        ),
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

      const expectedMessages: Array<JSONRPCRequestMessage> = messages.map(
        () => {
          const request: JSONRPCRequestMessage = {
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
        streamFactory: async () => streamPair,
        middlewareFactory: middlewareUtils.defaultClientMiddlewareWrapper(
          () => {
            return {
              forward: new TransformStream(),
              reverse: new TransformStream<JSONRPCResponse, JSONRPCResponse>({
                transform: (chunk, controller) => {
                  controller.enqueue({
                    ...chunk,
                    result: 'one',
                  });
                },
              }),
            };
          },
        ),
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
        expect(value).toBe('one');
        await writer.write(value);
      }
      await outputResult;
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
        streamFactory: async () => streamPair,
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
        streamFactory: async () => streamPair,
        logger,
      });
      const { output, writable } = await rpcClient.methods.client();
      const writer = writable.getWriter();
      for (const param of params) {
        await writer.write(param);
      }
      expect(await output).toStrictEqual(message.result);
      await writer.close();
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
        streamFactory: async () => streamPair,
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
    'manifest raw caller',
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
        streamFactory: async () => streamPair,
        logger,
      });
      const callerInterface = await rpcClient.methods.raw(headerParams);
      await callerInterface.readable.pipeTo(outputWritableStream);
      const writer = callerInterface.writable.getWriter();
      for (const inputDatum of inputData) {
        await writer.write(inputDatum);
      }
      await writer.close();

      const expectedHeader: JSONRPCRequest = {
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
        streamFactory: async () => streamPair,
        logger,
      });
      let count = 0;
      const callerInterface = await rpcClient.methods.duplex();
      const writer = callerInterface.writable.getWriter();
      for await (const value of callerInterface.readable) {
        count += 1;
        await writer.write(value);
      }
      await writer.close();
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
      streamFactory: async () => {
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
  describe('raw caller', () => {
    test('raw caller uses default timeout when creating stream', async () => {
      const holdProm = promise();
      let ctx: ContextTimed | undefined;
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx_) => {
          ctx = ctx_;
          await holdProm.p;
          // Should never reach this when testing
          return {} as ReadableWritablePair<Uint8Array, Uint8Array>;
        },
        streamKeepAliveTimeoutTime: 100,
        logger,
      });
      // Timing out on stream creation
      const callerInterfaceProm = rpcClient.rawStreamCaller('testMethod', {});
      await expect(callerInterfaceProm).toReject();
      await expect(callerInterfaceProm).rejects.toThrow(
        rpcErrors.ErrorRpcTimedOut,
      );
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBeInstanceOf(rpcErrors.ErrorRpcTimedOut);
    });
    test('raw caller times out when creating stream', async () => {
      const holdProm = promise();
      let ctx: ContextTimed | undefined;
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx_) => {
          ctx = ctx_;
          await holdProm.p;
          // Should never reach this when testing
          return {} as ReadableWritablePair<Uint8Array, Uint8Array>;
        },
        logger,
      });
      // Timing out on stream creation
      const callerInterfaceProm = rpcClient.rawStreamCaller(
        'testMethod',
        {},
        { timer: new Timer({ delay: 100 }) },
      );
      await expect(callerInterfaceProm).toReject();
      await expect(callerInterfaceProm).rejects.toThrow(
        rpcErrors.ErrorRpcTimedOut,
      );
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBeInstanceOf(rpcErrors.ErrorRpcTimedOut);
    });
    test('raw caller handles abort when creating stream', async () => {
      const holdProm = promise();
      let ctx: ContextTimed | undefined;
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx_) => {
          ctx = ctx_;
          await holdProm.p;
          // Should never reach this when testing
          return {} as ReadableWritablePair<Uint8Array, Uint8Array>;
        },
        logger,
      });
      const abortController = new AbortController();
      const rejectReason = Symbol('rejectReason');
      abortController.abort(rejectReason);

      // Timing out on stream creation
      const callerInterfaceProm = rpcClient.rawStreamCaller(
        'testMethod',
        {},
        { signal: abortController.signal },
      );
      await expect(callerInterfaceProm).toReject();
      await expect(callerInterfaceProm).rejects.toBe(rejectReason);
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBe(rejectReason);
    });
    test('raw caller uses default timeout awaiting stream', async () => {
      const forwardPassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const reversePassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const streamPair: ReadableWritablePair<Uint8Array, Uint8Array> = {
        writable: forwardPassThroughStream.writable,
        readable: reversePassThroughStream.readable,
      };
      let ctx: ContextTimed | undefined;
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx_) => {
          ctx = ctx_;
          return streamPair;
        },
        streamKeepAliveTimeoutTime: 200,
        logger,
      });

      // Timing out on stream.
      // Stream creation needs to read the header to complete.
      await Promise.all([
        rpcClient.rawStreamCaller('testMethod', {}),
        forwardPassThroughStream.readable.getReader().read(),
      ]);
      await ctx?.timer;
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBeInstanceOf(rpcErrors.ErrorRpcTimedOut);
    });
    test('raw caller times out awaiting stream', async () => {
      const forwardPassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const reversePassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const streamPair: ReadableWritablePair<Uint8Array, Uint8Array> = {
        writable: forwardPassThroughStream.writable,
        readable: reversePassThroughStream.readable,
      };
      let ctx: ContextTimed | undefined;
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx_) => {
          ctx = ctx_;
          return streamPair;
        },
        logger,
      });
      // Timing out on stream
      await Promise.all([
        rpcClient.rawStreamCaller(
          'testMethod',
          {},
          { timer: new Timer({ delay: 100 }) },
        ),
        forwardPassThroughStream.readable.getReader().read(),
      ]);
      await ctx?.timer;
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBeInstanceOf(rpcErrors.ErrorRpcTimedOut);
    });
    test('raw caller handles abort awaiting stream', async () => {
      const forwardPassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const reversePassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const streamPair: ReadableWritablePair<Uint8Array, Uint8Array> = {
        writable: forwardPassThroughStream.writable,
        readable: reversePassThroughStream.readable,
      };
      const ctxProm = promise<ContextTimed>();
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx) => {
          ctxProm.resolveP(ctx);
          return streamPair;
        },
        logger,
      });
      const abortController = new AbortController();
      const rejectReason = Symbol('rejectReason');
      // Timing out on stream
      const reader = forwardPassThroughStream.readable.getReader();
      await Promise.all([
        rpcClient.rawStreamCaller(
          'testMethod',
          {},
          { signal: abortController.signal },
        ),
        reader.read(),
      ]);
      const ctx = await ctxProm.p;
      const abortProm = promise<void>();
      if (ctx.signal.aborted) abortProm.resolveP();
      ctx.signal.addEventListener('abort', () => {
        abortProm.resolveP();
      });
      abortController.abort(rejectReason);
      await abortProm.p;
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBe(rejectReason);
    });
  });
  describe('duplex caller', () => {
    test('duplex caller uses default timeout when creating stream', async () => {
      const holdProm = promise();
      let ctx: ContextTimed | undefined;
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx_) => {
          ctx = ctx_;
          await holdProm.p;
          // Should never reach this when testing
          return {} as ReadableWritablePair<Uint8Array, Uint8Array>;
        },
        streamKeepAliveTimeoutTime: 100,
        logger,
      });
      // Timing out on stream creation
      const callerInterfaceProm = rpcClient.duplexStreamCaller('testMethod');
      await expect(callerInterfaceProm).toReject();
      await expect(callerInterfaceProm).rejects.toThrow(
        rpcErrors.ErrorRpcTimedOut,
      );
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBeInstanceOf(rpcErrors.ErrorRpcTimedOut);
    });
    test('duplex caller times out when creating stream', async () => {
      const holdProm = promise();
      let ctx: ContextTimed | undefined;
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx_) => {
          ctx = ctx_;
          await holdProm.p;
          // Should never reach this when testing
          return {} as ReadableWritablePair<Uint8Array, Uint8Array>;
        },
        logger,
      });
      // Timing out on stream creation
      const callerInterfaceProm = rpcClient.duplexStreamCaller('testMethod', {
        timer: new Timer({ delay: 100 }),
      });
      await expect(callerInterfaceProm).toReject();
      await expect(callerInterfaceProm).rejects.toThrow(
        rpcErrors.ErrorRpcTimedOut,
      );
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBeInstanceOf(rpcErrors.ErrorRpcTimedOut);
    });
    test('duplex caller handles abort when creating stream', async () => {
      const holdProm = promise();
      let ctx: ContextTimed | undefined;
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx_) => {
          ctx = ctx_;
          await holdProm.p;
          // Should never reach this when testing
          return {} as ReadableWritablePair<Uint8Array, Uint8Array>;
        },
        logger,
      });
      const abortController = new AbortController();
      const rejectReason = Symbol('rejectReason');
      abortController.abort(rejectReason);

      // Timing out on stream creation
      const callerInterfaceProm = rpcClient.duplexStreamCaller('testMethod', {
        signal: abortController.signal,
      });
      await expect(callerInterfaceProm).toReject();
      await expect(callerInterfaceProm).rejects.toBe(rejectReason);
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBe(rejectReason);
    });
    test('duplex caller uses default timeout awaiting stream', async () => {
      const forwardPassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const reversePassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const streamPair: ReadableWritablePair<Uint8Array, Uint8Array> = {
        writable: forwardPassThroughStream.writable,
        readable: reversePassThroughStream.readable,
      };
      let ctx: ContextTimed | undefined;
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx_) => {
          ctx = ctx_;
          return streamPair;
        },
        streamKeepAliveTimeoutTime: 100,
        logger,
      });

      // Timing out on stream
      await rpcClient.duplexStreamCaller('testMethod');
      await ctx?.timer;
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBeInstanceOf(rpcErrors.ErrorRpcTimedOut);
    });
    test('duplex caller times out awaiting stream', async () => {
      const forwardPassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const reversePassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const streamPair: ReadableWritablePair<Uint8Array, Uint8Array> = {
        writable: forwardPassThroughStream.writable,
        readable: reversePassThroughStream.readable,
      };
      let ctx: ContextTimed | undefined;
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx_) => {
          ctx = ctx_;
          return streamPair;
        },
        logger,
      });

      // Timing out on stream
      await rpcClient.duplexStreamCaller('testMethod', {
        timer: new Timer({ delay: 100 }),
      });
      await ctx?.timer;
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBeInstanceOf(rpcErrors.ErrorRpcTimedOut);
    });
    test('duplex caller handles abort awaiting stream', async () => {
      const forwardPassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const reversePassThroughStream = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const streamPair: ReadableWritablePair<Uint8Array, Uint8Array> = {
        writable: forwardPassThroughStream.writable,
        readable: reversePassThroughStream.readable,
      };
      const ctxProm = promise<ContextTimed>();
      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamFactory: async (ctx) => {
          ctxProm.resolveP(ctx);
          return streamPair;
        },
        logger,
      });
      const abortController = new AbortController();
      const rejectReason = Symbol('rejectReason');
      abortController.abort(rejectReason);
      // Timing out on stream
      await rpcClient.duplexStreamCaller('testMethod', {
        signal: abortController.signal,
      });
      const ctx = await ctxProm.p;
      const abortProm = promise<void>();
      if (ctx.signal.aborted) abortProm.resolveP();
      ctx.signal.addEventListener('abort', () => {
        abortProm.resolveP();
      });
      expect(ctx?.signal.aborted).toBeTrue();
      expect(ctx?.signal.reason).toBe(rejectReason);
    });
    testProp(
      'duplex caller timeout is refreshed when sending message',
      [specificMessageArb],
      async (messages) => {
        const inputStream = rpcTestUtils.messagesToReadableStream(messages);
        const [outputResult, outputStream] =
          rpcTestUtils.streamToArray<Uint8Array>();
        const streamPair: ReadableWritablePair = {
          readable: inputStream,
          writable: outputStream,
        };
        const ctxProm = promise<ContextTimed>();
        const rpcClient = await RPCClient.createRPCClient({
          manifest: {},
          streamFactory: async (ctx) => {
            ctxProm.resolveP(ctx);
            return streamPair;
          },
          logger,
        });
        const callerInterface = await rpcClient.duplexStreamCaller<
          JSONValue,
          JSONValue
        >(methodName);

        const ctx = await ctxProm.p;
        // Reading refreshes timer
        const reader = callerInterface.readable.getReader();
        await sleep(50);
        let timeLeft = ctx.timer.getTimeout();
        const message = await reader.read();
        expect(ctx.timer.getTimeout()).toBeGreaterThan(timeLeft);
        reader.releaseLock();
        for await (const _ of callerInterface.readable) {
          // Do nothing
        }

        // Writing should refresh timer
        const writer = callerInterface.writable.getWriter();
        await sleep(50);
        timeLeft = ctx.timer.getTimeout();
        await writer.write(message.value);
        expect(ctx.timer.getTimeout()).toBeGreaterThan(timeLeft);
        await writer.close();

        await outputResult;
        await rpcClient.destroy();
      },
      { numRuns: 5 },
    );
    testProp(
      'Check that ctx is provided to the middleWare and that the middleware can reset the timer',
      [specificMessageArb],
      async (messages) => {
        const inputStream = rpcTestUtils.messagesToReadableStream(messages);
        const [outputResult, outputStream] =
          rpcTestUtils.streamToArray<Uint8Array>();
        const streamPair: ReadableWritablePair = {
          readable: inputStream,
          writable: outputStream,
        };
        const ctxProm = promise<ContextTimed>();
        const rpcClient = await RPCClient.createRPCClient({
          manifest: {},
          streamFactory: async (ctx) => {
            ctxProm.resolveP(ctx);
            return streamPair;
          },
          middlewareFactory: middlewareUtils.defaultClientMiddlewareWrapper(
            (ctx) => {
              ctx.timer.reset(1000);
              return {
                forward: new TransformStream(),
                reverse: new TransformStream(),
              };
            },
          ),
          logger,
        });
        const callerInterface = await rpcClient.duplexStreamCaller<
          JSONValue,
          JSONValue
        >(methodName);

        const ctx = await ctxProm.p;
        // Writing should refresh timer engage the middleware
        const writer = callerInterface.writable.getWriter();
        await writer.write({});
        expect(ctx.timer.delay).toBe(1000);
        await writer.close();

        await outputResult;
        await rpcClient.destroy();
      },
      { numRuns: 1 },
    );
  });
});
