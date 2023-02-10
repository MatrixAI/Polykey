import type {
  ClientHandlerImplementation,
  ContainerType,
  DuplexHandlerImplementation,
  JsonRpcRequest,
  RawHandlerImplementation,
  ServerHandlerImplementation,
  UnaryHandlerImplementation,
} from '@/RPC/types';
import type { ConnectionInfo } from '@/network/types';
import { fc, testProp } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import RPCServer from '@/RPC/RPCServer';
import RPCClient from '@/RPC/RPCClient';
import {
  ClientHandler,
  DuplexHandler,
  RawHandler,
  ServerHandler,
  UnaryHandler,
} from '@/RPC/handlers';
import {
  ClientCaller,
  DuplexCaller,
  RawCaller,
  ServerCaller,
  UnaryCaller,
} from '@/RPC/callers';
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

      let header: JsonRpcRequest | undefined;
      class TestMethod extends RawHandler {
        public handle: RawHandlerImplementation = ([input, header_]) => {
          header = header_;
          return input;
        };
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new RawCaller(),
        },
        streamPairCreateCallback: async () => clientPair,
        logger,
      });

      const callerInterface = await rpcClient.rawMethods.testMethod({
        hello: 'world',
      });
      const writer = callerInterface.writable.getWriter();
      const pipeProm = callerInterface.readable.pipeTo(outputWriterStream);
      for (const value of inputData) {
        await writer.write(value);
      }
      await writer.close();
      const expectedHeader: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'testMethod',
        params: { hello: 'world' },
        id: null,
      };
      expect(header).toStrictEqual(expectedHeader);
      expect(await outputResult).toStrictEqual(inputData);
      await pipeProm;
      await rpcServer.destroy();
      await rpcClient.destroy();
    },
  );
  testProp(
    'RPC communication with duplex stream',
    [fc.array(rpcTestUtils.safeJsonValueArb, { minLength: 1 })],
    async (values) => {
      const { clientPair, serverPair } = rpcTestUtils.createTapPairs<
        Uint8Array,
        Uint8Array
      >();
      class TestMethod extends DuplexHandler {
        public handle: DuplexHandlerImplementation = async function* (input) {
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
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new DuplexCaller(),
        },
        streamPairCreateCallback: async () => clientPair,
        logger,
      });

      const callerInterface = await rpcClient.rawMethods.testMethod();
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
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new ServerCaller<number, number>(),
        },
        streamPairCreateCallback: async () => clientPair,
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
        public handle: ClientHandlerImplementation<number, number> = async (
          input,
        ) => {
          let acc = 0;
          for await (const number of input) {
            acc += number;
          }
          return acc;
        };
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new ClientCaller<number, number>(),
        },
        streamPairCreateCallback: async () => clientPair,
        logger,
      });

      await rpcClient.methods.testMethod(async function* (output) {
        for (const value of values) {
          yield value;
        }
        // Ending writes
        yield undefined;
        // Checking output
        const expectedResult = values.reduce((p, c) => p + c);
        await expect(output).resolves.toEqual(expectedResult);
      });

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
        public handle: UnaryHandlerImplementation = async (input) => input;
      }
      const rpcServer = await RPCServer.createRPCServer({
        manifest: {
          testMethod: new TestMethod({}),
        },
        logger,
      });
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {
          testMethod: new UnaryCaller(),
        },
        streamPairCreateCallback: async () => clientPair,
        logger,
      });

      const result = await rpcClient.methods.testMethod(value);
      expect(result).toStrictEqual(value);
      await rpcServer.destroy();
      await rpcClient.destroy();
    },
  );
});
