import type { DuplexStreamHandler, JsonRpcMessage } from '@/RPC/types';
import type { JSONValue } from '@/types';
import type { ConnectionInfo, Host, Port } from '@/network/types';
import type { NodeId } from '@/ids';
import type { ReadableWritablePair } from 'stream/web';
import { testProp, fc } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import RPC from '@/RPC/RPC';
import * as rpcErrors from '@/RPC/errors';
import * as rpcTestUtils from './utils';

describe(`${RPC.name}`, () => {
  const logger = new Logger(`${RPC.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);

  const methodName = 'testMethod';
  const specificMessageArb = fc
    .array(rpcTestUtils.jsonRpcRequestArb(fc.constant(methodName)), {
      minLength: 5,
    })
    .noShrink();

  testProp.only('can stream data', [specificMessageArb], async (messages) => {
    const stream = rpcTestUtils.jsonRpcStream(messages);
    const container = {};
    const rpc = await RPC.createRpc({ container, logger });
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

    rpc.registerDuplexStreamHandler(methodName, duplexHandler);
    rpc.handleStream(readWriteStream, {} as ConnectionInfo);
    await outputResult;
  });

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
      const rpc = await RPC.createRpc({ container, logger });
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

      rpc.registerDuplexStreamHandler(methodName, duplexHandler);
      rpc.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
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
      const rpc = await RPC.createRpc({ container, logger });
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
      rpc.registerDuplexStreamHandler(methodName, duplexHandler);
      rpc.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
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
      const rpc = await RPC.createRpc({ container, logger });
      const [outputResult, outputStream] = rpcTestUtils.streamToArray();
      let thing;
      let lastMessage: JsonRpcMessage | undefined;
      const tapStream = new rpcTestUtils.TapStream<Buffer>(
        async (_, iteration) => {
          if (iteration === 2) {
            // @ts-ignore: kidnap private property
            const activeStreams = rpc.activeStreams.values();
            for (const activeStream of activeStreams) {
              thing = activeStream;
              activeStream.cancel(new rpcErrors.ErrorRpcStopping());
            }
          }
        },
      );
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
      rpc.registerDuplexStreamHandler(methodName, duplexHandler);
      rpc.handleStream(readWriteStream, {} as ConnectionInfo);
      await outputResult;
      await expect(thing).toResolve();
      // Last message should be an error message
      expect(lastMessage).toBeDefined();
      expect(lastMessage?.type).toBe('JsonRpcResponseError');
    },
  );

  testProp('Handler yields nothing', [specificMessageArb], async (messages) => {
    const stream = rpcTestUtils.jsonRpcStream(messages);
    const container = {};
    const rpc = await RPC.createRpc({ container, logger });
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

    rpc.registerDuplexStreamHandler(methodName, duplexHandler);
    rpc.handleStream(readWriteStream, {} as ConnectionInfo);
    await outputResult;
    // We're just expecting no errors
  });

  // TODO:
  //  - Test for each type of handler
  //    - duplex
  //    - client stream
  //    - server stream
  //    - unary
  //  - Test odd conditions for handlers, like extra messages where 1 is expected.
});
