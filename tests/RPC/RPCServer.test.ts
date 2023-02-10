import type {
  ClientHandlerImplementation,
  ContainerType,
  DuplexHandlerImplementation,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcResponseError,
  RawHandlerImplementation,
  ServerHandlerImplementation,
  UnaryHandlerImplementation,
} from '@/RPC/types';
import type { JSONValue } from '@/types';
import type { ConnectionInfo, Host, Port } from '@/network/types';
import type { NodeId } from '@/ids';
import type { ReadableWritablePair } from 'stream/web';
import { TransformStream, ReadableStream } from 'stream/web';
import { fc, testProp } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import RPCServer from '@/RPC/RPCServer';
import * as rpcErrors from '@/RPC/errors';
import * as rpcUtils from '@/RPC/utils';
import {
  ClientHandler,
  DuplexHandler,
  RawHandler,
  ServerHandler,
  UnaryHandler,
} from '@/RPC/handlers';
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
  const errorArb = fc.oneof(
    fc.constant(new rpcErrors.ErrorRpcParse()),
    fc.constant(new rpcErrors.ErrorRpcMessageLength()),
    fc.constant(new rpcErrors.ErrorRpcRemoteError()),
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
        public handle: RawHandlerImplementation = ([input]) => {
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
        };
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
        public handle: DuplexHandlerImplementation = async function* (input) {
          for await (const val of input) {
            yield val;
            break;
          }
        };
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
        public handle: ClientHandlerImplementation = async function (input) {
          let count = 0;
          for await (const _ of input) {
            count += 1;
          }
          return count;
        };
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
        public handle: ServerHandlerImplementation<number, number> =
          async function* (input) {
            for (let i = 0; i < input; i++) {
              yield i;
            }
          };
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
        public handle: UnaryHandlerImplementation = async (input) => input;
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
        public handle: DuplexHandlerImplementation = async function* (input) {
          expect(this.container).toBe(container);
          for await (const val of input) {
            yield val;
          }
        };
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
        public handle: DuplexHandlerImplementation = async function* (
          input,
          connectionInfo_,
        ) {
          handledConnectionInfo = connectionInfo_;
          for await (const val of input) {
            yield val;
          }
        };
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
  // Problem with the tap stream. It seems to block the whole stream.
  //  If I don't pipe the tap to the output we actually iterate over some data.
  testProp('Handler can be aborted', [specificMessageArb], async (messages) => {
    const stream = rpcTestUtils.messagesToReadableStream(messages);
    class TestMethod extends DuplexHandler {
      public handle: DuplexHandlerImplementation = async function* (
        input,
        _connectionInf,
        ctx,
      ) {
        for await (const val of input) {
          if (ctx.signal.aborted) throw ctx.signal.reason;
          yield val;
        }
      };
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
            activeStream.cancel(new rpcErrors.ErrorRpcStopping());
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
      rpcUtils.parseJsonRpcResponseError(JSON.parse(lastMessage.toString())),
    ).not.toThrow();
    await rpcServer.destroy();
  });
  testProp('Handler yields nothing', [specificMessageArb], async (messages) => {
    const stream = rpcTestUtils.messagesToReadableStream(messages);
    class TestMethod extends DuplexHandler {
      public handle: DuplexHandlerImplementation = async function* (input) {
        for await (const _ of input) {
          // Do nothing, just consume
        }
      };
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
    [specificMessageArb, errorArb],
    async (messages, error) => {
      const stream = rpcTestUtils.messagesToReadableStream(messages);
      class TestMethod extends DuplexHandler {
        public handle: DuplexHandlerImplementation = async function* () {
          throw error;
        };
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      let resolve, reject;
      const errorProm = new Promise((resolve_, reject_) => {
        resolve = resolve_;
        reject = reject_;
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
      const errorMessage = JSON.parse((await outputResult)[0]!.toString());
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
      const stream = rpcTestUtils.messagesToReadableStream(messages);
      class TestMethod extends DuplexHandler {
        public handle: DuplexHandlerImplementation = async function* () {
          throw new rpcErrors.ErrorRpcPlaceholderConnectionError();
        };
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      let resolve, reject;
      const errorProm = new Promise((resolve_, reject_) => {
        resolve = resolve_;
        reject = reject_;
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
      await outputResult;

      await rpcServer.destroy();
      reject();
      await expect(errorProm).toResolve();
    },
  );
  testProp('forward middlewares', [specificMessageArb], async (messages) => {
    const stream = rpcTestUtils.messagesToReadableStream(messages);
    class TestMethod extends DuplexHandler {
      public handle: DuplexHandlerImplementation = async function* (input) {
        for await (const val of input) {
          yield val;
        }
      };
    }
    const middleware = rpcUtils.defaultServerMiddlewareWrapper(() => {
      return {
        forward: new TransformStream({
          transform: (chunk, controller) => {
            chunk.params = 1;
            controller.enqueue(chunk);
          },
        }),
        reverse: new TransformStream(),
      };
    });
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        testMethod: new TestMethod({}),
      },
      middleware,
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
      public handle: DuplexHandlerImplementation = async function* (input) {
        for await (const val of input) {
          yield val;
        }
      };
    }
    const middleware = rpcUtils.defaultServerMiddlewareWrapper(() => {
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
      middleware,
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
        public handle: DuplexHandlerImplementation = async function* (input) {
          for await (const val of input) {
            yield val;
          }
        };
      }
      const middleware = rpcUtils.defaultServerMiddlewareWrapper(() => {
        let first = true;
        let reverseController: TransformStreamDefaultController<JsonRpcResponse>;
        return {
          forward: new TransformStream<
            JsonRpcRequest<TestType>,
            JsonRpcRequest<TestType>
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
        middleware,
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
      const failureMessage: JsonRpcResponseError = {
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
