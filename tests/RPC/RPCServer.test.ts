import type {
  ClientStreamHandler,
  DuplexStreamHandler,
  JsonRpcMessage,
  ServerStreamHandler,
  UnaryHandler,
} from '@/RPC/types';
import type { JSONValue } from '@/types';
import type { ConnectionInfo, Host, Port } from '@/network/types';
import type { NodeId } from '@/ids';
import type { ReadableWritablePair } from 'stream/web';
import { testProp, fc } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import RPCServer from '@/RPC/RPCServer';
import * as rpcErrors from '@/RPC/errors';
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

  testProp(
    'can stream data with duplex stream handler',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.jsonRpcStream(messages);
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };

      const duplexHandler: DuplexStreamHandler<JSONValue, JSONValue> =
        async function* (input, _container, _connectionInfo, _ctx) {
          for await (const val of input) {
            yield val;
            break;
          }
        };

      rpcServer.registerDuplexStreamHandler(methodName, duplexHandler);
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
  );

  testProp(
    'can stream data with client stream handler',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.jsonRpcStream(messages);
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };

      const clientHandler: ClientStreamHandler<JSONValue, number> =
        async function (input, _container, _connectionInfo, _ctx) {
          let count = 0;
          for await (const _ of input) {
            count += 1;
          }
          return count;
        };

      rpcServer.registerClientStreamHandler(methodName, clientHandler);
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
  );

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

  testProp(
    'can stream data with server stream handler',
    [singleNumberMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.jsonRpcStream(messages);
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };

      const serverHandler: ServerStreamHandler<number, number> =
        async function* (input, _container, _connectionInfo, _ctx) {
          for (let i = 0; i < input; i++) {
            yield i;
          }
        };

      rpcServer.registerServerStreamHandler(methodName, serverHandler);
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
  );

  testProp(
    'can stream data with server stream handler',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.jsonRpcStream(messages);
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };

      const unaryHandler: UnaryHandler<JSONValue, JSONValue> = async function (
        input,
        _container,
        _connectionInfo,
        _ctx,
      ) {
        return input;
      };

      rpcServer.registerUnaryHandler(methodName, unaryHandler);
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
  );

  testProp(
    'Handler is provided with container',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.jsonRpcStream(messages);
      const container = {
        a: Symbol('a'),
        B: Symbol('b'),
        C: Symbol('c'),
      };
      const rpcServer = await RPCServer.createRPCServer({ container, logger });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };

      const duplexHandler: DuplexStreamHandler<JSONValue, JSONValue> =
        async function* (input, container_, _connectionInfo, _ctx) {
          expect(container_).toBe(container);
          for await (const val of input) {
            yield val;
          }
        };

      rpcServer.registerDuplexStreamHandler(methodName, duplexHandler);
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
  );

  testProp(
    'Handler is provided with connectionInfo',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.jsonRpcStream(messages);
      const connectionInfo: ConnectionInfo = {
        localHost: 'hostA' as Host,
        localPort: 12341 as Port,
        remoteCertificates: [],
        remoteHost: 'hostA' as Host,
        remoteNodeId: 'asd' as unknown as NodeId,
        remotePort: 12341 as Port,
      };
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: outputStream,
      };

      const duplexHandler: DuplexStreamHandler<JSONValue, JSONValue> =
        async function* (input, _container, connectionInfo_, _ctx) {
          expect(connectionInfo_).toBe(connectionInfo);
          for await (const val of input) {
            yield val;
          }
        };
      rpcServer.registerDuplexStreamHandler(methodName, duplexHandler);
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await rpcServer.destroy();
    },
  );

  // Problem with the tap stream. It seems to block the whole stream.
  //  If I don't pipe the tap to the output we actually iterate over some data.
  testProp.skip(
    'Handler can be aborted',
    [specificMessageArb],
    async (messages) => {
      const stream = rpcTestUtils.jsonRpcStream(messages);
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      let thing;
      let lastMessage: JsonRpcMessage | undefined;
      const tapStream: any = {};
      // Const tapStream = new rpcTestUtils.TapStream<Uint8Array>(
      //   async (_, iteration) => {
      //     if (iteration === 2) {
      //       // @ts-ignore: kidnap private property
      //       const activeStreams = rpcServer.activeStreams.values();
      //       for (const activeStream of activeStreams) {
      //         thing = activeStream;
      //         activeStream.cancel(new rpcErrors.ErrorRpcStopping());
      //       }
      //     }
      //   },
      // );
      await tapStream.readable.pipeTo(outputStream);
      const readWriteStream: ReadableWritablePair = {
        readable: stream,
        writable: tapStream.writable,
      };

      const duplexHandler: DuplexStreamHandler<JSONValue, JSONValue> =
        async function* (input, _container, _connectionInfo, ctx) {
          for await (const val of input) {
            if (ctx.signal.aborted) throw ctx.signal.reason;
            yield val;
          }
        };
      rpcServer.registerDuplexStreamHandler(methodName, duplexHandler);
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await expect(thing).toResolve();
      // Last message should be an error message
      expect(lastMessage).toBeDefined();
      await rpcServer.destroy();
    },
  );

  testProp('Handler yields nothing', [specificMessageArb], async (messages) => {
    const stream = rpcTestUtils.jsonRpcStream(messages);
    const container = {};
    const rpcServer = await RPCServer.createRPCServer({ container, logger });
    const [outputResult, outputStream] = rpcTestUtils.streamToArray();
    const readWriteStream: ReadableWritablePair = {
      readable: stream,
      writable: outputStream,
    };

    const duplexHandler: DuplexStreamHandler<JSONValue, JSONValue> =
      async function* (input, _container, _connectionInfo, _ctx) {
        for await (const _ of input) {
          // Do nothing, just consume
        }
      };

    rpcServer.registerDuplexStreamHandler(methodName, duplexHandler);
    rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
    await outputResult;
    // We're just expecting no errors
    await rpcServer.destroy();
  });

  const errorArb = fc.oneof(
    fc.constant(new rpcErrors.ErrorRpcParse()),
    fc.constant(new rpcErrors.ErrorRpcHandlerMissing()),
    fc.constant(new rpcErrors.ErrorRpcProtocal()),
    fc.constant(new rpcErrors.ErrorRpcMessageLength()),
    fc.constant(new rpcErrors.ErrorRpcRemoteError()),
  );
  testProp(
    'should send error message',
    [specificMessageArb, errorArb],
    async (messages, error) => {
      const stream = rpcTestUtils.jsonRpcStream(messages);
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });
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

      const duplexHandler: DuplexStreamHandler<JSONValue, JSONValue> =
        async function* (_input, _container, _connectionInfo, _ctx) {
          throw error;
        };

      rpcServer.registerDuplexStreamHandler(methodName, duplexHandler);
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
      const stream = rpcTestUtils.jsonRpcStream(messages);
      const container = {};
      const rpcServer = await RPCServer.createRPCServer({ container, logger });
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

      const duplexHandler: DuplexStreamHandler<JSONValue, JSONValue> =
        async function* (_input, _container, _connectionInfo, _ctx) {
          throw new rpcErrors.ErrorRpcPlaceholderConnectionError();
        };

      rpcServer.registerDuplexStreamHandler(methodName, duplexHandler);
      rpcServer.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;

      await rpcServer.destroy();
      reject();
      await expect(errorProm).toResolve();
    },
  );

  // TODO:
  //  - Test odd conditions for handlers, like extra messages where 1 is expected.
  //  - Expectations can't be inside the handlers otherwise they're caught.
  //  - get the tap transform stream working
});
