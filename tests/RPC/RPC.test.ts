import type { JsonRpcRequest, ManifestItem } from '@/RPC/types';
import type { ConnectionInfo } from '@/network/types';
import { fc, testProp } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import RPCServer from '@/RPC/RPCServer';
import RPCClient from '@/RPC/RPCClient';
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
      const testMethod: ManifestItem = {
        type: 'RAW',
        handler: ([input, header_], _container, _connectionInfo, _ctx) => {
          header = header_;
          return input;
        },
      };
      const manifest = {
        testMethod,
      };
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({
        manifest,
        container,
        logger,
      });
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest,
        streamPairCreateCallback: async () => clientPair,
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

      const testMethod: ManifestItem = {
        type: 'DUPLEX',
        handler: async function* (input, _container, _connectionInfo, _ctx) {
          for await (const val of input) {
            yield val;
          }
        },
      };
      const manifest = {
        testMethod,
      };
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({
        manifest,
        container,
        logger,
      });
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest,
        streamPairCreateCallback: async () => clientPair,
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

      const testMethod: ManifestItem<number, number> = {
        type: 'SERVER',
        handler: async function* (input, _container, _connectionInfo, _ctx) {
          for (let i = 0; i < input; i++) {
            yield i;
          }
        },
      };
      const manifest = {
        testMethod,
      };
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({
        manifest,
        container,
        logger,
      });
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest,
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

      const testMethod: ManifestItem<number, number> = {
        type: 'CLIENT',
        handler: async (input) => {
          let acc = 0;
          for await (const number of input) {
            acc += number;
          }
          return acc;
        },
      };
      const manifest = {
        testMethod,
      };
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({
        manifest,
        container,
        logger,
      });
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest,
        streamPairCreateCallback: async () => clientPair,
        logger,
      });

      const callerInterface = await rpcClient.methods.testMethod();
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

      const testMethod: ManifestItem = {
        type: 'UNARY',
        handler: async (input) => input,
      };
      const manifest = {
        testMethod,
      };
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({
        manifest,
        container,
        logger,
      });
      rpcServer.handleStream(serverPair, {} as ConnectionInfo);

      const rpcClient = await RPCClient.createRPCClient({
        manifest,
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
