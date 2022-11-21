import type { TestServiceClient } from '@/proto/js/polykey/v1/test_service_grpc_pb';
import type { Host, Port } from '@/network/types';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { getLogger } from '@grpc/grpc-js/build/src/logging';
import * as grpcUtils from '@/grpc/utils';
import * as grpcErrors from '@/grpc/errors';
import * as errors from '@/errors';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as utils from './utils';
import * as testUtils from '../utils';

describe('GRPC utils', () => {
  const logger = new Logger('GRPC utils Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: TestServiceClient, server: grpc.Server, port: number;
  const nodeId = testUtils.generateRandomNodeId();
  const host = '127.0.0.1' as Host;
  beforeAll(async () => {
    // Mocked authenticate always passes authentication
    const authenticate = async (metaClient, metaServer = new grpc.Metadata()) =>
      metaServer;
    [server, port] = await utils.openTestServer(authenticate, logger);
    client = await utils.openTestClient(port);
  }, globalThis.defaultTimeout);
  afterAll(async () => {
    utils.closeTestClient(client);
    setTimeout(() => {
      // Duplex error tests prevents the GRPC server from gracefully shutting down
      // this will force it to shutdown
      logger.info('Test GRPC Server Hanging, Forcing Shutdown');
      utils.closeTestServerForce(server);
    }, 2000);
    await utils.closeTestServer(server);
  });
  test('setting the global GRPC logger', () => {
    const grpcLogger1 = getLogger();
    // Sets the global GRPC logger to the logger
    grpcUtils.setLogger(logger);
    const grpcLogger2 = getLogger();
    // These objects should not be the same
    expect(grpcLogger1).not.toBe(grpcLogger2);
  });
  test('promisified client unary call', async () => {
    const unary = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client,
      {
        nodeId,
        host,
        port: port as Port,
        command: 'unary',
      },
      client.unary,
    );
    const messageTo = new utilsPB.EchoMessage();
    messageTo.setChallenge('some random string');
    const pCall = unary(messageTo);
    expect(pCall.call.getPeer()).toBe(`dns:127.0.0.1:${port}`);
    const messageFrom = await pCall;
    expect(messageFrom.getChallenge()).toBe(messageTo.getChallenge());
  });
  test('promisified client unary call error', async () => {
    const unary = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client,
      {
        nodeId,
        host,
        port: port as Port,
        command: 'unary',
      },
      client.unary,
    );
    const messageTo = new utilsPB.EchoMessage();
    messageTo.setChallenge('error');
    const pCall = unary(messageTo);
    await expect(pCall).rejects.toThrow(grpcErrors.ErrorPolykeyRemote);
    try {
      await pCall;
    } catch (e) {
      // This information comes from the server
      expect(e.message).toBe('test error');
      expect(e.metadata.nodeId).toBe(nodeId);
      expect(e.metadata.host).toBe(host);
      expect(e.metadata.port).toBe(port);
      expect(e.metadata.command).toBe('unary');
      expect(e.cause).toBeInstanceOf(grpcErrors.ErrorGRPC);
      expect(e.cause.data).toMatchObject({
        grpc: true,
      });
    }
  });
  test('promisified reading server stream', async () => {
    const serverStream =
      grpcUtils.promisifyReadableStreamCall<utilsPB.EchoMessage>(
        client,
        {
          nodeId,
          host,
          port: port as Port,
          command: 'serverStream',
        },
        client.serverStream,
      );
    const challenge = '4444';
    const messageTo = new utilsPB.EchoMessage();
    messageTo.setChallenge(challenge);
    const stream = serverStream(messageTo);
    const received: Array<string> = [];
    for await (const messageFrom of stream) {
      expect(messageFrom.getChallenge()).toBe(messageTo.getChallenge());
      received.push(messageFrom.getChallenge());
    }
    expect(received.length).toBe(challenge.length);
    const result = await stream.next();
    expect(result).toMatchObject({
      value: undefined,
      done: true,
    });
    expect(stream.stream.destroyed).toBe(true);
    // Notice this changes to 127.0.0.1
    expect(stream.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisified reading server stream - error', async () => {
    const serverStream =
      grpcUtils.promisifyReadableStreamCall<utilsPB.EchoMessage>(
        client,
        {
          nodeId,
          host,
          port: port as Port,
          command: 'serverStream',
        },
        client.serverStream,
      );
    const challenge = 'error';
    const messageTo = new utilsPB.EchoMessage();
    messageTo.setChallenge(challenge);
    const stream = serverStream(messageTo);
    await expect(() => stream.next()).rejects.toThrow(
      grpcErrors.ErrorPolykeyRemote,
    );
    // The generator will have ended
    // the internal stream will be automatically destroyed
    const result = await stream.next();
    expect(result).toMatchObject({
      value: undefined,
      done: true,
    });
    expect(stream.stream.destroyed).toBe(true);
    // Notice this changes to 127.0.0.1
    expect(stream.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisified reading server stream - destroy first', async () => {
    const serverStream =
      grpcUtils.promisifyReadableStreamCall<utilsPB.EchoMessage>(
        client,
        {
          nodeId,
          host,
          port: port as Port,
          command: 'serverStream',
        },
        client.serverStream,
      );
    const challenge = '4444';
    const messageTo = new utilsPB.EchoMessage();
    messageTo.setChallenge(challenge);
    const stream = serverStream(messageTo);
    // Destroy the stream at the beginning
    const result1 = await stream.next(null);
    expect(result1).toMatchObject({
      value: undefined,
      done: true,
    });
    const result2 = await stream.next();
    expect(result2).toMatchObject({
      value: undefined,
      done: true,
    });
    expect(stream.stream.destroyed).toBe(true);
    expect(stream.stream.getPeer()).toBe(`dns:127.0.0.1:${port}`);
  });
  test('promisified reading server stream - destroy second', async () => {
    const serverStream =
      grpcUtils.promisifyReadableStreamCall<utilsPB.EchoMessage>(
        client,
        {
          nodeId,
          host,
          port: port as Port,
          command: 'serverStream',
        },
        client.serverStream,
      );
    const challenge = '4444';
    const messageTo = new utilsPB.EchoMessage();
    messageTo.setChallenge(challenge);
    const stream = serverStream(messageTo);
    const result1 = await stream.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBeInstanceOf(utilsPB.EchoMessage);
    const result2 = await stream.next(null);
    expect(result2).toMatchObject({
      value: undefined,
      done: true,
    });
    const result3 = await stream.next();
    expect(result3).toMatchObject({
      value: undefined,
      done: true,
    });
    expect(stream.stream.destroyed).toBe(true);
    // Notice this changes to 127.0.0.1
    expect(stream.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisified writing client stream', async () => {
    const clientStream = grpcUtils.promisifyWritableStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      client,
      {
        nodeId,
        host,
        port: port as Port,
        command: 'clientStream',
      },
      client.clientStream,
    );
    const [genStream, response] = clientStream();
    const m = new utilsPB.EchoMessage();
    m.setChallenge('d89f7u983e4d');
    for (let i = 0; i < 5; i++) {
      await genStream.next(m);
    }
    await genStream.next(null); // Closed stream
    const m_ = await response;
    expect(m_.getChallenge().length).toBe(m.getChallenge().length * 5);
    expect(genStream.stream.getPeer()).toBe(`127.0.0.1:${port}`);
    expect(genStream.stream.destroyed).toBe(true);
  });
  test('promisified writing client stream - end first', async () => {
    const clientStream = grpcUtils.promisifyWritableStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      client,
      {
        nodeId,
        host,
        port: port as Port,
        command: 'clientStream',
      },
      client.clientStream,
    );
    const [genStream, response] = clientStream();
    const result1 = await genStream.next(null); // Closed stream
    expect(result1).toMatchObject({
      value: undefined,
      done: true,
    });
    const result2 = await genStream.next();
    expect(result2).toMatchObject({
      value: undefined,
      done: true,
    });
    const incomingMessage = await response;
    expect(incomingMessage.getChallenge()).toBe('');
    expect(genStream.stream.destroyed).toBe(true);
    expect(genStream.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisify reading and writing duplex stream', async () => {
    const duplexStream = grpcUtils.promisifyDuplexStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      client,
      {
        nodeId,
        host,
        port: port as Port,
        command: 'duplexStream',
      },
      client.duplexStream,
    );
    const genDuplex = duplexStream();
    const messageTo = new utilsPB.EchoMessage();
    messageTo.setChallenge('d89f7u983e4d');
    await genDuplex.write(messageTo);
    const response1 = await genDuplex.read();
    expect(response1.done).toBe(false);
    expect(response1.value).toBeInstanceOf(utilsPB.EchoMessage);
    const response2 = await genDuplex.read();
    expect(response2.done).toBe(false);
    expect(response2.value).toBeInstanceOf(utilsPB.EchoMessage);
    await genDuplex.next(null);
    expect(genDuplex.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisify reading and writing duplex stream - end and destroy with next', async () => {
    const duplexStream = grpcUtils.promisifyDuplexStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      client,
      {
        nodeId,
        host,
        port: port as Port,
        command: 'duplexStream',
      },
      client.duplexStream,
    );
    const genDuplex = duplexStream();
    await genDuplex.next(null);
    expect(genDuplex.stream.destroyed).toBe(true);
    expect(genDuplex.stream.getPeer()).toBe(`dns:127.0.0.1:${port}`);
  });
  test('promisify reading and writing duplex stream - end and destroy with write and read', async () => {
    const duplexStream = grpcUtils.promisifyDuplexStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      client,
      {
        nodeId,
        host,
        port: port as Port,
        command: 'duplexStream',
      },
      client.duplexStream,
    );
    const genDuplex = duplexStream();
    // When duplex streams are ended, reading will hang
    await genDuplex.write(null);
    // The only thing you can do is to destroy the read stream
    await genDuplex.read(null);
    expect(genDuplex.stream.destroyed).toBe(true);
    expect(genDuplex.stream.getPeer()).toBe(`dns:127.0.0.1:${port}`);
  });
  test('promisify reading and writing duplex stream - cannot write after destroy', async () => {
    const duplexStream = grpcUtils.promisifyDuplexStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      client,
      {
        nodeId,
        host,
        port: port as Port,
        command: 'duplexStream',
      },
      client.duplexStream,
    );
    const genDuplex = duplexStream();
    await genDuplex.read(null);
    const messageTo = new utilsPB.EchoMessage();
    messageTo.setChallenge('d89f7u983e4d');
    await expect(() => genDuplex.write(messageTo)).rejects.toThrow(
      /Cannot call write after a stream was destroyed/,
    );
    try {
      await genDuplex.write(messageTo);
    } catch (e) {
      expect(e.code).toBe('ERR_STREAMED_DESTROYED');
    }
    expect(genDuplex.stream.destroyed).toBe(true);
    expect(genDuplex.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisify reading and writing duplex stream - error with read', async () => {
    const duplexStream = grpcUtils.promisifyDuplexStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      client,
      {
        nodeId,
        host,
        port: port as Port,
        command: 'duplexStream',
      },
      client.duplexStream,
    );
    const genDuplex = duplexStream();
    const messageTo = new utilsPB.EchoMessage();
    messageTo.setChallenge('error');
    await genDuplex.write(messageTo);
    await expect(() => genDuplex.read()).rejects.toThrow(
      grpcErrors.ErrorPolykeyRemote,
    );
    expect(genDuplex.stream.destroyed).toBe(true);
    expect(genDuplex.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisify reading and writing duplex stream - error with next', async () => {
    const duplexStream = grpcUtils.promisifyDuplexStreamCall<
      utilsPB.EchoMessage,
      utilsPB.EchoMessage
    >(
      client,
      {
        nodeId,
        host,
        port: port as Port,
        command: 'duplexStream',
      },
      client.duplexStream,
    );
    const genDuplex = duplexStream();
    const messageTo = new utilsPB.EchoMessage();
    messageTo.setChallenge('error');
    await expect(() => genDuplex.next(messageTo)).rejects.toThrow(
      grpcErrors.ErrorPolykeyRemote,
    );
    expect(genDuplex.stream.destroyed).toBe(true);
    expect(genDuplex.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('serialising and deserialising Polykey errors', async () => {
    const timestamp = new Date();
    const error = new errors.ErrorPolykey<undefined>('test error', {
      timestamp,
      data: {
        int: 1,
        str: 'one',
      },
    });
    error.exitCode = 255;
    const serialised = grpcUtils.fromError(error).metadata!;
    const stringifiedError = serialised.get('error')[0] as string;
    const parsedError = JSON.parse(stringifiedError);
    expect(parsedError).toMatchObject({
      type: 'ErrorPolykey',
      data: expect.any(Object),
    });
    const deserialisedError = grpcUtils.toError(
      {
        name: '',
        message: '',
        code: 2,
        details: '',
        metadata: serialised,
      },
      {
        nodeId,
        host,
        port: port as Port,
        command: 'testCall',
      },
    );
    expect(deserialisedError).toBeInstanceOf(grpcErrors.ErrorPolykeyRemote);
    expect(deserialisedError.message).toBe('test error');
    // @ts-ignore - already checked above that error is ErrorPolykeyRemote
    const metadata = deserialisedError.metadata;
    expect(metadata.nodeId).toBe(nodeId);
    expect(metadata.host).toBe(host);
    expect(metadata.port).toBe(port);
    expect(metadata.command).toBe('testCall');
    expect(deserialisedError.cause).toBeInstanceOf(errors.ErrorPolykey);
    expect(deserialisedError.cause.message).toBe('test error');
    expect(deserialisedError.cause.exitCode).toBe(255);
    expect(deserialisedError.cause.timestamp).toEqual(timestamp);
    expect(deserialisedError.cause.data).toEqual(error.data);
    expect(deserialisedError.cause.stack).toBe(error.stack);
  });
  test('serialising and deserialising generic errors', async () => {
    const error = new TypeError('test error');
    const serialised = grpcUtils.fromError(error).metadata!;
    const stringifiedError = serialised.get('error')[0] as string;
    const parsedError = JSON.parse(stringifiedError);
    expect(parsedError).toMatchObject({
      type: 'TypeError',
      data: expect.any(Object),
    });
    const deserialisedError = grpcUtils.toError(
      {
        name: '',
        message: '',
        code: 2,
        details: '',
        metadata: serialised,
      },
      {
        nodeId,
        host,
        port: port as Port,
        command: 'testCall',
      },
    );
    expect(deserialisedError).toBeInstanceOf(grpcErrors.ErrorPolykeyRemote);
    expect(deserialisedError.message).toBe('test error');
    // @ts-ignore - already checked above that error is ErrorPolykeyRemote
    const metadata = deserialisedError.metadata;
    expect(metadata.nodeId).toBe(nodeId);
    expect(metadata.host).toBe(host);
    expect(metadata.port).toBe(port);
    expect(metadata.command).toBe('testCall');
    expect(deserialisedError.cause).toBeInstanceOf(TypeError);
    expect(deserialisedError.cause.message).toBe('test error');
    expect(deserialisedError.cause.stack).toBe(error.stack);
  });
  test('serialising and de-serialising non-errors', async () => {
    const error = 'not an error' as unknown as Error;
    const serialised = grpcUtils.fromError(error).metadata!;
    const stringifiedError = serialised.get('error')[0] as string;
    const parsedError = JSON.parse(stringifiedError);
    expect(parsedError).toEqual('not an error');
    const deserialisedError = grpcUtils.toError(
      {
        name: '',
        message: '',
        code: 2,
        details: '',
        metadata: serialised,
      },
      {
        nodeId,
        host,
        port: port as Port,
        command: 'testCall',
      },
    );
    expect(deserialisedError).toBeInstanceOf(grpcErrors.ErrorPolykeyRemote);
    // @ts-ignore - already checked above that error is ErrorPolykeyRemote
    const metadata = deserialisedError.metadata;
    expect(metadata.nodeId).toBe(nodeId);
    expect(metadata.host).toBe(host);
    expect(metadata.port).toBe(port);
    expect(metadata.command).toBe('testCall');
    expect(deserialisedError.cause).toBeInstanceOf(errors.ErrorPolykeyUnknown);
    // This is slightly brittle because it's based on what we choose to do
    // with unknown data in our grpc reviver
    expect(deserialisedError.cause.data.json).toEqual('not an error');
  });
  test('serialising and deserialising sensitive errors', async () => {
    const timestamp = new Date();
    const error = new errors.ErrorPolykey<undefined>('test error', {
      timestamp,
      data: {
        int: 1,
        str: 'one',
      },
    });
    error.exitCode = 255;
    const serialised = grpcUtils.fromError(error, true).metadata!;
    const stringifiedError = serialised.get('error')[0] as string;
    const parsedError = JSON.parse(stringifiedError);
    // Stack is the only thing that should not be serialised
    expect(parsedError).toEqual({
      type: 'ErrorPolykey',
      data: {
        description: errors.ErrorPolykey.description,
        message: 'test error',
        exitCode: 255,
        timestamp: expect.any(String),
        data: error.data,
      },
    });
    const deserialisedError = grpcUtils.toError(
      {
        name: '',
        message: '',
        code: 2,
        details: '',
        metadata: serialised,
      },
      {
        nodeId,
        host,
        port: port as Port,
        command: 'testCall',
      },
    );
    expect(deserialisedError).toBeInstanceOf(grpcErrors.ErrorPolykeyRemote);
    expect(deserialisedError.message).toBe('test error');
    // @ts-ignore - already checked above that error is ErrorPolykeyRemote
    const metadata = deserialisedError.metadata;
    expect(metadata.nodeId).toBe(nodeId);
    expect(metadata.host).toBe(host);
    expect(metadata.port).toBe(port);
    expect(metadata.command).toBe('testCall');
    expect(deserialisedError.cause).toBeInstanceOf(errors.ErrorPolykey);
    expect(deserialisedError.cause.message).toBe('test error');
    expect(deserialisedError.cause.exitCode).toBe(255);
    expect(deserialisedError.cause.timestamp).toEqual(timestamp);
    expect(deserialisedError.cause.data).toEqual(error.data);
    expect(deserialisedError.cause.stack).not.toBe(error.stack);
  });
});
