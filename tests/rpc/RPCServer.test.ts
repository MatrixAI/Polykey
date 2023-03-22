import type {
  ContainerType,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCResponseError,
} from '@/rpc/types';
import type { JSONValue } from '@/types';
import type { ConnectionInfo, Host, Port } from '@/network/types';
import type { NodeId } from '@/ids';
import type { ReadableWritablePair } from 'stream/web';
import type { ContextCancellable } from '@/contexts/types';
import type { RPCErrorEvent } from '@/rpc/utils';
import { TransformStream, ReadableStream } from 'stream/web';
import { fc, testProp } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import RPCServer from '@/rpc/RPCServer';
import * as rpcErrors from '@/rpc/errors';
import * as rpcUtils from '@/rpc/utils';
import {
  ClientHandler,
  DuplexHandler,
  RawHandler,
  ServerHandler,
  UnaryHandler,
} from '@/rpc/handlers';
import * as middlewareUtils from '@/rpc/utils/middleware';
import * as rpcTestUtils from './utils';

describe(`${RPCServer.name}`, () => {
  const logger = new Logger(`${RPCServer.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const methodName = 'testMethod';
  const specificMessageArb = fc
    .array(rpcTestUtils.jsonRpcRequestMessageArb(fc.constant(methodName)), {
      minLength: 5,
    })
    .noShrink();
  const singleNumberMessageArb = fc.array(
    rpcTestUtils.jsonRpcRequestMessageArb(
      fc.constant(methodName),
      fc.integer({ min: 1, max: 20 }),
    ),
    {
      minLength: 2,
      maxLength: 10,
    },
  );
  const validToken = 'VALIDTOKEN';
  const invalidTokenMessageArb = rpcTestUtils.jsonRpcRequestMessageArb(
    fc.constant('testMethod'),
    fc.record({
      metadata: fc.record({
        token: fc.string().filter((v) => v !== validToken),
      }),
      data: rpcTestUtils.safeJsonValueArb,
    }),
  );

  testProp(
    'can stream data with raw duplex stream handler',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils
        .messagesToReadableStream(messages)
        .pipeThrough(
          rpcTestUtils.binaryStreamToSnippedStream([4, 7, 13, 2, 6]),
        );
      class TestHandler extends RawHandler {
        public handle([input, _header]): ReadableStream<Uint8Array> {
          void (async () => {
            for await (const _ of input) {
              // No touch, only consume
            }
          })().catch(() => {});
          return new ReadableStream<Uint8Array>({
            start: (controller) => {
              controller.enqueue(Buffer.from('hello world!'));
              controller.close();
            },
          });
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestHandler({}),
        },
        logger,
      });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
    { numRuns: 1 },
  );
  testProp(
    'can stream data with duplex stream handler',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.messagesToReadableStream(messages);
      class TestMethod extends DuplexHandler {
        public async *handle(
          input: AsyncIterable<JSONValue>,
        ): AsyncIterable<JSONValue> {
          for await (const val of input) {
            yield val;
            break;
          }
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
  );
  testProp(
    'can stream data with client stream handler',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.messagesToReadableStream(messages);
      class TestMethod extends ClientHandler {
        public async handle(
          input: AsyncIterable<JSONValue>,
        ): Promise<JSONValue> {
          let count = 0;
          for await (const _ of input) {
            count += 1;
          }
          return count;
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
  );
  testProp(
    'can stream data with server stream handler',
    [singleNumberMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.messagesToReadableStream(messages);
      class TestMethod extends ServerHandler<ContainerType, number, number> {
        public async *handle(input: number): AsyncIterable<number> {
          for (let i = 0; i < input; i++) {
            yield i;
          }
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
  );
  testProp(
    'can stream data with server stream handler',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.messagesToReadableStream(messages);
      class TestMethod extends UnaryHandler {
        public async handle(input: JSONValue): Promise<JSONValue> {
          return input;
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
  );
  testProp(
    'Handler is provided with container',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.messagesToReadableStream(messages);
      const container = {
        a: Symbol('a'),
        B: Symbol('b'),
        C: Symbol('c'),
      };
      class TestMethod extends DuplexHandler<typeof container> {
        public async *handle(
          input: AsyncIterable<JSONValue>,
        ): AsyncIterable<JSONValue> {
          expect(this.container).toBe(container);
          for await (const val of input) {
            yield val;
          }
        }
      }

      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod(container),
        },
        logger,
      });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
  );
  testProp(
    'Handler is provided with connectionInfo',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.messagesToReadableStream(messages);
      const connectionInfo: ConnectionInfo = {
        localHost: 'hostA' as Host,
        localPort: 12341 as Port,
        remoteCertificates: [],
        remoteHost: 'hostA' as Host,
        remoteNodeId: 'asd' as unknown as NodeId,
        remotePort: 12341 as Port,
      };
      let handledConnectionInfo;
      class TestMethod extends DuplexHandler {
        public async *handle(
          input: AsyncIterable<JSONValue>,
          connectionInfo_: ConnectionInfo,
        ): AsyncIterable<JSONValue> {
          handledConnectionInfo = connectionInfo_;
          for await (const val of input) {
            yield val;
          }
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };
      rpcServer.handleStream(readWriteStream, connectionInfo);
      await outputResult;
      await rpcServer.destroy();
      expect(handledConnectionInfo).toBe(connectionInfo);
    },
  );
  testProp('Handler can be aborted', [specificMessageArb], async (messages) => {
    const stream = rpcTestUtils.messagesToReadableStream(messages);
    class TestMethod extends DuplexHandler {
      public async *handle(
        input: AsyncIterable<JSONValue>,
        connectionInfo_: ConnectionInfo,
        ctx: ContextCancellable,
      ): AsyncIterable<JSONValue> {
        for await (const val of input) {
          if (ctx.signal.aborted) throw ctx.signal.reason;
          yield val;
        }
      }
    }
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        testMethod: new TestMethod({}),
      },
      logger,
    });
    const [outputResult, outputStream] =
      rpcTestUtils.streamToArray<Uint8Array>();
    let thing;
    const tapStream = rpcTestUtils.tapTransformStream<Uint8Array>(
      async (_, iteration) => {
        if (iteration === 2) {
          // @ts-ignore: kidnap private property
          const activeStreams = rpcServer.activeStreams.values();
          // @ts-ignore: kidnap private property
          for (const activeStream of activeStreams) {
            thing = activeStream;
            activeStream.cancel(new rpcErrors.ErrorRPCStopping());
          }
        }
      },
    );
    void tapStream.readable.pipeTo(outputStream).catch(() => {});
    const readWriteStream: ReadableWritablePair = {
      readable: stream,
      writable: tapStream.writable,
    };
    rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
    const result = await outputResult;
    const lastMessage = result[result.length - 1];
    await expect(thing).toResolve();
    expect(lastMessage).toBeDefined();
    expect(() =>
      rpcUtils.parseJSONRPCResponseError(JSON.parse(lastMessage.toString())),
    ).not.toThrow();
    await rpcServer.destroy();
  });
  testProp('Handler yields nothing', [specificMessageArb], async (messages) => {
    const stream = rpcTestUtils.messagesToReadableStream(messages);
    class TestMethod extends DuplexHandler {
      public async *handle(
        input: AsyncIterable<JSONValue>,
      ): AsyncIterable<JSONValue> {
        for await (const _ of input) {
          // Do nothing, just consume
        }
      }
    }
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        testMethod: new TestMethod({}),
      },
      logger,
    });
    const [outputResult, outputStream] = rpcTestUtils.streamToArray();
    const readWriteStream: ReadableWritablePair = {
      readable: stream,
      writable: outputStream,
    };
    rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
    await outputResult;
    // We're just expecting no errors
    await rpcServer.destroy();
  });
  testProp(
    'should send error message',
    [specificMessageArb, rpcTestUtils.errorArb(rpcTestUtils.errorArb())],
    async (messages, error) => {
      const stream = rpcTestUtils.messagesToReadableStream(messages);
      class TestMethod extends DuplexHandler {
        public async *handle(): AsyncIterable<JSONValue> {
          throw error;
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      let resolve, reject;
      const errorProm = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
      });
      rpcServer.addEventListener('error', (thing) => {
        resolve(thing);
      });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      const rawErrorMessage = (await outputResult)[0]!.toString();
      expect(rawErrorMessage).toInclude('stack');
      const errorMessage = JSON.parse(rawErrorMessage);
      expect(errorMessage.error.code).toEqual(error.exitCode);
      expect(errorMessage.error.message).toEqual(error.description);
      reject();
      await expect(errorProm).toReject();
      await rpcServer.destroy();
    },
  );
  testProp(
    'should send error message with sensitive',
    [specificMessageArb, rpcTestUtils.errorArb(rpcTestUtils.errorArb())],
    async (messages, error) => {
      const stream = rpcTestUtils.messagesToReadableStream(messages);
      class TestMethod extends DuplexHandler {
        public async *handle(): AsyncIterable<JSONValue> {
          throw error;
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        sensitive: true,
        logger,
      });
      let resolve, reject;
      const errorProm = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
      });
      rpcServer.addEventListener('error', (thing) => {
        resolve(thing);
      });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      const rawErrorMessage = (await outputResult)[0]!.toString();
      expect(rawErrorMessage).not.toInclude('stack');
      const errorMessage = JSON.parse(rawErrorMessage);
      expect(errorMessage.error.code).toEqual(error.exitCode);
      expect(errorMessage.error.message).toEqual(error.description);
      reject();
      await expect(errorProm).toReject();
      await rpcServer.destroy();
    },
  );
  testProp(
    'should emit stream error',
    [specificMessageArb],
    async (messages) => {
      class TestMethod extends DuplexHandler {
        public async *handle(input): AsyncIterable<JSONValue> {
          // Echo input
          yield* input;
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      let resolve;
      const errorProm = new Promise<RPCErrorEvent>((_resolve) => {
        resolve = _resolve;
      });
      rpcServer.addEventListener('error', (thing) => {
        resolve(thing);
      });
      const passThroughStreamIn = new TransformStream<Uint8Array, Uint8Array>();
      const passThroughStreamOut = new TransformStream<
        Uint8Array,
        Uint8Array
      >();
      const readWriteStream: ReadableWritablePair<Uint8Array, Uint8Array> = {
        readable: passThroughStreamIn.readable,
        writable: passThroughStreamOut.writable,
      };
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      const writer = passThroughStreamIn.writable.getWriter();
      const reader = passThroughStreamOut.readable.getReader();
      // Write messages
      for (const message of messages) {
        await writer.write(Buffer.from(JSON.stringify(message)));
        await reader.read();
      }
      // Abort stream
      const writerReason = Symbol('writerAbort');
      const readerReason = Symbol('readerAbort');
      await writer.abort(writerReason);
      await reader.cancel(readerReason);
      // We should get an error event
      const event = await errorProm;
      expect(event.detail.error.cause).toContain(writerReason);
      expect(event.detail.error.cause).toContain(readerReason);
      await rpcServer.destroy();
    },
    { numRuns: 1 },
  );
  testProp('forward middlewares', [specificMessageArb], async (messages) => {
    const stream = rpcTestUtils.messagesToReadableStream(messages);
    class TestMethod extends DuplexHandler {
      public async *handle(
        input: AsyncIterable<JSONValue>,
      ): AsyncIterable<JSONValue> {
        yield* input;
      }
    }
    const middlewareFactory = middlewareUtils.defaultServerMiddlewareWrapper(
      () => {
        return {
          forward: new TransformStream({
            transform: (chunk, controller) => {
              chunk.params = 1;
              controller.enqueue(chunk);
            },
          }),
          reverse: new TransformStream(),
        };
      },
    );
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        testMethod: new TestMethod({}),
      },
      middlewareFactory: middlewareFactory,
      logger,
    });
    const [outputResult, outputStream] = rpcTestUtils.streamToArray();
    const readWriteStream: ReadableWritablePair = {
      readable: stream,
      writable: outputStream,
    };
    rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
    const out = await outputResult;
    expect(out.map((v) => v!.toString())).toStrictEqual(
      messages.map(() => {
        return JSON.stringify({
          jsonrpc: '2.0',
          result: 1,
          id: null,
        });
      }),
    );
    await rpcServer.destroy();
  });
  testProp('reverse middlewares', [specificMessageArb], async (messages) => {
    const stream = rpcTestUtils.messagesToReadableStream(messages);
    class TestMethod extends DuplexHandler {
      public async *handle(
        input: AsyncIterable<JSONValue>,
      ): AsyncIterable<JSONValue> {
        yield* input;
      }
    }
    const middleware = middlewareUtils.defaultServerMiddlewareWrapper(() => {
      return {
        forward: new TransformStream(),
        reverse: new TransformStream({
          transform: (chunk, controller) => {
            if ('result' in chunk) chunk.result = 1;
            controller.enqueue(chunk);
          },
        }),
      };
    });
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        testMethod: new TestMethod({}),
      },
      middlewareFactory: middleware,
      logger,
    });
    const [outputResult, outputStream] = rpcTestUtils.streamToArray();
    const readWriteStream: ReadableWritablePair = {
      readable: stream,
      writable: outputStream,
    };
    rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
    const out = await outputResult;
    expect(out.map((v) => v!.toString())).toStrictEqual(
      messages.map(() => {
        return JSON.stringify({
          jsonrpc: '2.0',
          result: 1,
          id: null,
        });
      }),
    );
    await rpcServer.destroy();
  });
  testProp(
    'forward middleware authentication',
    [invalidTokenMessageArb],
    async (message) => {
      const stream = rpcTestUtils.messagesToReadableStream([message]);
      class TestMethod extends DuplexHandler {
        public async *handle(
          input: AsyncIterable<JSONValue>,
        ): AsyncIterable<JSONValue> {
          yield* input;
        }
      }
      const middleware = middlewareUtils.defaultServerMiddlewareWrapper(() => {
        let first = true;
        let reverseController: TransformStreamDefaultController<JSONRPCResponse>;
        return {
          forward: new TransformStream<
            JSONRPCRequest<TestType>,
            JSONRPCRequest<TestType>
          >({
            transform: (chunk, controller) => {
              if (first && chunk.params?.metadata.token !== validToken) {
                reverseController.enqueue(failureMessage);
                // Closing streams early
                controller.terminate();
                reverseController.terminate();
              }
              first = false;
              controller.enqueue(chunk);
            },
          }),
          reverse: new TransformStream({
            start: (controller) => {
              // Kidnapping reverse controller
              reverseController = controller;
            },
            transform: (chunk, controller) => {
              controller.enqueue(chunk);
            },
          }),
        };
      });
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        middlewareFactory: middleware,
        logger,
      });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };
      type TestType = {
        metadata: {
          token: string;
        };
        data: JSONValue;
      };
      const failureMessage: JSONRPCResponseError = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: 1,
          message: 'failure of some kind',
        },
      };
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      expect((await outputResult).toString()).toEqual(
        JSON.stringify(failureMessage),
      );
      await rpcServer.destroy();
    },
  );
  // TODO:
  //  - Test odd conditions for handlers, like extra messages where 1 is expected.
  //  - Expectations can't be inside the handlers otherwise they're caught.
  //  - get the tap transform stream working
});
