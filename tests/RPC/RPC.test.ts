import type {
  ClientStreamHandler,
  DuplexStreamHandler,
  JsonRpcRequest,
  RawDuplexStreamHandler,
  ServerStreamHandler,
  UnaryHandler,
} from '@/RPC/types';
import type { ConnectionInfo } from '@/network/types';
import type { JSONValue } from '@/types';
import { fc, testProp } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import RPCServer from '@/RPC/RPCServer';
import RPCClient from '@/RPC/RPCClient';
import * as rpcTestUtils from './utils';

describe('RPC', () => {
  const logger = new Logger(`RPC Test`, LogLevel.WARN, [new StreamHandler()]);

  const methodName = 'testMethod';

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

      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });
      let header: JsonRpcRequest | undefined;
      const rawHandler: RawDuplexStreamHandler = (
        [input, header_],
        _container,
        _connectionInfo,
        _ctx,
      ) => {
        header = header_;
        return input;
      };

      rpcServer.registerRawStreamHandler(methodName, rawHandler);
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => clientPair,
        logger,
      });

      const callerInterface = await rpcClient.rawStreamCaller(methodName, {
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
        method: methodName,
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

      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });

      const duplexHandler: DuplexStreamHandler<JSONValue, JSONValue> =
        async function* (input, _container, _connectionInfo, _ctx) {
          for await (const val of input) {
            yield val;
          }
        };

      rpcServer.registerDuplexStreamHandler(methodName, duplexHandler);
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => clientPair,
        logger,
      });

      const callerInterface = await rpcClient.duplexStreamCaller(methodName);
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

      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });

      const serverStreamHandler: ServerStreamHandler<number, number> =
        async function* (input, _container, _connectionInfo, _ctx) {
          for (let i = 0; i < input; i++) {
            yield i;
          }
        };

      rpcServer.registerServerStreamHandler(methodName, serverStreamHandler);
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => clientPair,
        logger,
      });

      const callerInterface = await rpcClient.serverStreamCaller<
        number,
        number
      >(methodName, value);

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

      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });

      const clientStreamhandler: ClientStreamHandler<number, number> = async (
        input,
      ) => {
        let acc = 0;
        for await (const number of input) {
          acc += number;
        }
        return acc;
      };
      rpcServer.registerClientStreamHandler(methodName, clientStreamhandler);
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => clientPair,
        logger,
      });

      const callerInterface = await rpcClient.clientStreamCaller<
        number,
        number
      >(methodName);
      const writer = callerInterface.writable.getWriter();
      for (const value of values) {
        await writer.write(value);
      }
      await writer.close();

      const expectedResult = values.reduce((p, c) => p + c);
      await expect(callerInterface.output).resolves.toEqual(expectedResult);
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

      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });

      const unaryCaller: UnaryHandler<JSONValue, JSONValue> = async (input) =>
        input;
      rpcServer.registerUnaryHandler(methodName, unaryCaller);
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest: {},
        streamPairCreateCallback: async () => clientPair,
        logger,
      });

      const result = await rpcClient.unaryCaller<JSONValue, JSONValue>(
        methodName,
        value,
      );
      expect(result).toStrictEqual(value);
      await rpcServer.destroy();
      await rpcClient.destroy();
    },
  );
});
