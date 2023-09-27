import type { ContainerType, JSONRPCRequest } from '@/rpc/types';
import type { ReadableStream } from 'stream/web';
import type { JSONValue } from '@/types';
import { TransformStream } from 'stream/web';
import { fc, testProp } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as utils from '@/utils';
import RPCServer from '@/rpc/RPCServer';
import RPCClient from '@/rpc/RPCClient';
import {
  ClientHandler,
  DuplexHandler,
  RawHandler,
  ServerHandler,
  UnaryHandler,
} from '@/rpc/handlers';
import {
  ClientCaller,
  DuplexCaller,
  RawCaller,
  ServerCaller,
  UnaryCaller,
} from '@/rpc/callers';
import * as rpcErrors from '@/rpc/errors';
import * as rpcUtilsMiddleware from '@/rpc/utils/middleware';
import * as rpcTestUtils from './utils';

describe('RPC', () => {
  const logger = new Logger(`RPC Test`, LogLevel.WARN, [new StreamHandler()]);

  testProp(
    'RPC communication with raw stream',
    [rpcTestUtils.rawDataArb],
    async (inputData) => {
      const [outputResult, outputWriterStream] =
        rpcTestUtils.streamToArray<Uint8Array>();
      const { clientPair, serverPair } = rpcTestUtils.createTapPairs<
        Uint8Array,
        Uint8Array
      >();

      let header: JSONRPCRequest | undefined;
      class TestMethod extends RawHandler {
        public handle(
          input: [JSONRPCRequest, ReadableStream<Uint8Array>],
        ): [JSONValue, ReadableStream<Uint8Array>] {
          const [header_, stream] = input;
          header = header_;
          return ['some leading data', stream];
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      rpcServer.handleStream({
        ...serverPair,
        cancel: () => {},
      });

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new RawCaller(),
        },
        streamFactory: async () => {
          return {
            ...clientPair,
            cancel: () => {},
          };
        },
        logger,
      });

      const callerInterface = await rpcClient.methods.testMethod({
        hello: 'world',
      });
      const writer = callerInterface.writable.getWriter();
      const pipeProm = callerInterface.readable.pipeTo(outputWriterStream);
      for (const value of inputData) {
        await writer.write(value);
      }
      await writer.close();
      const expectedHeader: JSONRPCRequest = {
        jsonrpc: '2.0',
        method: 'testMethod',
        params: { hello: 'world' },
        id: null,
      };
      expect(header).toStrictEqual(expectedHeader);
      expect(callerInterface.meta?.result).toBe('some leading data');
      expect(await outputResult).toStrictEqual(inputData);
      await pipeProm;
      await rpcServer.destroy();
      await rpcClient.destroy();
    },
  );
  test('RPC communication with raw stream times out waiting for leading message', async () => {
    const { clientPair, serverPair } = rpcTestUtils.createTapPairs<
      Uint8Array,
      Uint8Array
    >();
    void (async () => {
      for await (const _ of serverPair.readable) {
        // Just consume
      }
    })();

    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        testMethod: new RawCaller(),
      },
      streamFactory: async () => {
        return {
          ...clientPair,
          cancel: () => {},
        };
      },
      logger,
    });

    await expect(
      rpcClient.methods.testMethod(
        {
          hello: 'world',
        },
        { timer: 100 },
      ),
    ).rejects.toThrow(rpcErrors.ErrorRPCTimedOut);
    await rpcClient.destroy();
  });
  test('RPC communication with raw stream, raw handler throws', async () => {
    const { clientPair, serverPair } = rpcTestUtils.createTapPairs<
      Uint8Array,
      Uint8Array
    >();

    class TestMethod extends RawHandler {
      public handle(): [JSONValue, ReadableStream<Uint8Array>] {
        throw Error('some error');
      }
    }
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        testMethod: new TestMethod({}),
      },
      logger,
    });
    rpcServer.handleStream({
      ...serverPair,
      cancel: () => {},
    });

    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        testMethod: new RawCaller(),
      },
      streamFactory: async () => {
        return {
          ...clientPair,
          cancel: () => {},
        };
      },
      logger,
    });

    await expect(
      rpcClient.methods.testMethod({
        hello: 'world',
      }),
    ).rejects.toThrow(rpcErrors.ErrorPolykeyRemote);

    await rpcServer.destroy();
    await rpcClient.destroy();
  });
  testProp(
    'RPC communication with duplex stream',
    [fc.array(rpcTestUtils.safeJsonValueArb, { minLength: 1 })],
    async (values) => {
      const { clientPair, serverPair } = rpcTestUtils.createTapPairs<
        Uint8Array,
        Uint8Array
      >();
      class TestMethod extends DuplexHandler {
        public async *handle(
          input: AsyncGenerator<JSONValue>,
        ): AsyncGenerator<JSONValue> {
          yield* input;
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      rpcServer.handleStream({
        ...serverPair,
        cancel: () => {},
      });

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new DuplexCaller(),
        },
        streamFactory: async () => {
          return {
            ...clientPair,
            cancel: () => {},
          };
        },
        logger,
      });

      const callerInterface = await rpcClient.methods.testMethod();
      const writer = callerInterface.writable.getWriter();
      const reader = callerInterface.readable.getReader();
      for (const value of values) {
        await writer.write(value);
        expect((await reader.read()).value).toStrictEqual(value);
      }
      await writer.close();
      const result = await reader.read();
      expect(result.value).toBeUndefined();
      expect(result.done).toBeTrue();
      await rpcServer.destroy();
      await rpcClient.destroy();
    },
  );
  testProp(
    'RPC communication with server stream',
    [fc.integer({ min: 1, max: 100 })],
    async (value) => {
      const { clientPair, serverPair } = rpcTestUtils.createTapPairs<
        Uint8Array,
        Uint8Array
      >();

      class TestMethod extends ServerHandler<ContainerType, number, number> {
        public async *handle(input: number): AsyncGenerator<number> {
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
      rpcServer.handleStream({
        ...serverPair,
        cancel: () => {},
      });

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new ServerCaller<number, number>(),
        },
        streamFactory: async () => {
          return {
            ...clientPair,
            cancel: () => {},
          };
        },
        logger,
      });

      const callerInterface = await rpcClient.methods.testMethod(value);

      const outputs: Array<number> = [];
      for await (const num of callerInterface) {
        outputs.push(num);
      }
      expect(outputs.length).toEqual(value);
      await rpcServer.destroy();
      await rpcClient.destroy();
    },
  );
  testProp(
    'RPC communication with client stream',
    [fc.array(fc.integer(), { minLength: 1 }).noShrink()],
    async (values) => {
      const { clientPair, serverPair } = rpcTestUtils.createTapPairs<
        Uint8Array,
        Uint8Array
      >();

      class TestMethod extends ClientHandler<ContainerType, number, number> {
        public async handle(input: AsyncIterable<number>): Promise<number> {
          let acc = 0;
          for await (const number of input) {
            acc += number;
          }
          return acc;
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      rpcServer.handleStream({
        ...serverPair,
        cancel: () => {},
      });

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new ClientCaller<number, number>(),
        },
        streamFactory: async () => {
          return {
            ...clientPair,
            cancel: () => {},
          };
        },
        logger,
      });

      const { output, writable } = await rpcClient.methods.testMethod();
      const writer = writable.getWriter();
      for (const value of values) {
        await writer.write(value);
      }
      await writer.close();
      const expectedResult = values.reduce((p, c) => p + c);
      await expect(output).resolves.toEqual(expectedResult);
      await rpcServer.destroy();
      await rpcClient.destroy();
    },
  );
  testProp(
    'RPC communication with unary call',
    [rpcTestUtils.safeJsonValueArb],
    async (value) => {
      const { clientPair, serverPair } = rpcTestUtils.createTapPairs<
        Uint8Array,
        Uint8Array
      >();

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
      rpcServer.handleStream({
        ...serverPair,
        cancel: () => {},
      });

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new UnaryCaller(),
        },
        streamFactory: async () => {
          return {
            ...clientPair,
            cancel: () => {},
          };
        },
        logger,
      });

      const result = await rpcClient.methods.testMethod(value);
      expect(result).toStrictEqual(value);
      await rpcServer.destroy();
      await rpcClient.destroy();
    },
  );
  testProp(
    'RPC handles and sends errors',
    [
      rpcTestUtils.safeJsonValueArb,
      rpcTestUtils.errorArb(rpcTestUtils.errorArb()),
    ],
    async (value, error) => {
      const { clientPair, serverPair } = rpcTestUtils.createTapPairs<
        Uint8Array,
        Uint8Array
      >();

      class TestMethod extends UnaryHandler {
        public async handle(): Promise<JSONValue> {
          throw error;
        }
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      rpcServer.handleStream({
        ...serverPair,
        cancel: () => {},
      });

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new UnaryCaller(),
        },
        streamFactory: async () => {
          return {
            ...clientPair,
            cancel: () => {},
          };
        },
        logger,
      });

      const callProm = rpcClient.methods.testMethod(value);
      await expect(callProm).rejects.toThrow(rpcErrors.ErrorPolykeyRemote);
      await expect(
        callProm.catch((e) => {
          throw e.cause;
        }),
      ).rejects.toThrow(error);
      expect(await callProm.catch((e) => JSON.stringify(e.cause))).toInclude(
        'stack',
      );
      await rpcServer.destroy();
      await rpcClient.destroy();
    },
  );
  testProp(
    'RPC handles and sends sensitive errors',
    [
      rpcTestUtils.safeJsonValueArb,
      rpcTestUtils.errorArb(rpcTestUtils.errorArb()),
    ],
    async (value, error) => {
      const { clientPair, serverPair } = rpcTestUtils.createTapPairs<
        Uint8Array,
        Uint8Array
      >();

      class TestMethod extends UnaryHandler {
        public async handle(): Promise<JSONValue> {
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
      rpcServer.handleStream({
        ...serverPair,
        cancel: () => {},
      });

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new UnaryCaller(),
        },
        streamFactory: async () => {
          return {
            ...clientPair,
            cancel: () => {},
          };
        },
        logger,
      });

      const callProm = rpcClient.methods.testMethod(value);
      await expect(callProm).rejects.toThrow(rpcErrors.ErrorPolykeyRemote);
      await expect(
        callProm.catch((e) => {
          throw e.cause;
        }),
      ).rejects.toThrow(error);
      expect(
        await callProm.catch((e) => JSON.stringify(e.cause)),
      ).not.toInclude('stack');
      await rpcServer.destroy();
      await rpcClient.destroy();
    },
  );
  test('middleware can end stream early', async () => {
    const { clientPair, serverPair } = rpcTestUtils.createTapPairs<
      Uint8Array,
      Uint8Array
    >();
    class TestMethod extends DuplexHandler {
      public async *handle(
        input: AsyncIterableIterator<JSONValue>,
      ): AsyncIterableIterator<JSONValue> {
        yield* input;
      }
    }
    const middleware = rpcUtilsMiddleware.defaultServerMiddlewareWrapper(() => {
      return {
        forward: new TransformStream({
          start: (controller) => {
            // Controller.terminate();
            controller.error(Error('SOME ERROR'));
          },
        }),
        reverse: new TransformStream({
          start: (controller) => {
            controller.error(Error('SOME ERROR'));
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
    rpcServer.handleStream({
      ...serverPair,
      cancel: () => {},
    });

    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        testMethod: new DuplexCaller(),
      },
      streamFactory: async () => {
        return {
          ...clientPair,
          cancel: () => {},
        };
      },
      logger,
    });

    const callerInterface = await rpcClient.methods.testMethod();
    const writer = callerInterface.writable.getWriter();
    await writer.write({});
    // Allow time to process buffer
    await utils.sleep(0);
    await expect(writer.write({})).toReject();
    const reader = callerInterface.readable.getReader();
    await expect(reader.read()).toReject();
    await expect(writer.closed).toReject();
    await expect(reader.closed).toReject();
    await expect(rpcServer.destroy(false)).toResolve();
    await rpcClient.destroy();
  });
});