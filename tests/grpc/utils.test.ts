import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils, errors as grpcErrors } from '@/grpc';
import { TestClient } from '@/proto/js/Test_grpc_pb';
import * as testPB from '@/proto/js/Test_pb';
import * as utils from './utils';

const logger = new Logger('utils test', LogLevel.INFO, [new StreamHandler()]);

describe('GRPC utils', () => {
  let client: TestClient, server: grpc.Server, port: number;
  beforeAll(async () => {
    [server, port] = await utils.openTestServer();
    client = await utils.openTestClient(port);
  }, global.polykeyStartupTimeout);
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
  test('promisified client unary call', async () => {
    const unary = grpcUtils.promisifyUnaryCall<testPB.EchoMessage>(
      client,
      client.unary,
    );
    const messageTo = new testPB.EchoMessage();
    messageTo.setChallenge('some random string');
    const pCall = unary(messageTo);
    expect(pCall.call.getPeer()).toBe(`dns:127.0.0.1:${port}`);
    const messageFrom = await pCall;
    expect(messageFrom.getChallenge()).toBe(messageTo.getChallenge());
  });
  test('promisified client unary call error', async () => {
    const unary = grpcUtils.promisifyUnaryCall<testPB.EchoMessage>(
      client,
      client.unary,
    );
    const messageTo = new testPB.EchoMessage();
    messageTo.setChallenge('error');
    const pCall = unary(messageTo);
    await expect(pCall).rejects.toThrow(grpcErrors.ErrorGRPC);
    try {
      await pCall;
    } catch (e) {
      // This information comes from the server
      expect(e.message).toBe('test error');
      expect(e.data).toMatchObject({
        grpc: true,
      });
    }
  });
  test('promisified reading server stream', async () => {
    const serverStream =
      grpcUtils.promisifyReadableStreamCall<testPB.EchoMessage>(
        client,
        client.serverStream,
      );
    const challenge = '4444';
    const messageTo = new testPB.EchoMessage();
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
      grpcUtils.promisifyReadableStreamCall<testPB.EchoMessage>(
        client,
        client.serverStream,
      );
    const challenge = 'error';
    const messageTo = new testPB.EchoMessage();
    messageTo.setChallenge(challenge);
    const stream = serverStream(messageTo);
    await expect(stream.next()).rejects.toThrow(grpcErrors.ErrorGRPC);
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
      grpcUtils.promisifyReadableStreamCall<testPB.EchoMessage>(
        client,
        client.serverStream,
      );
    const challenge = '4444';
    const messageTo = new testPB.EchoMessage();
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
      grpcUtils.promisifyReadableStreamCall<testPB.EchoMessage>(
        client,
        client.serverStream,
      );
    const challenge = '4444';
    const messageTo = new testPB.EchoMessage();
    messageTo.setChallenge(challenge);
    const stream = serverStream(messageTo);
    const result1 = await stream.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBeInstanceOf(testPB.EchoMessage);
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
      testPB.EchoMessage,
      testPB.EchoMessage
    >(client, client.clientStream);
    const [genStream, response] = clientStream();
    const m = new testPB.EchoMessage();
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
      testPB.EchoMessage,
      testPB.EchoMessage
    >(client, client.clientStream);
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
      testPB.EchoMessage,
      testPB.EchoMessage
    >(client, client.duplexStream);
    const genDuplex = duplexStream();
    const messageTo = new testPB.EchoMessage();
    messageTo.setChallenge('d89f7u983e4d');
    await genDuplex.write(messageTo);
    const response1 = await genDuplex.read();
    expect(response1.done).toBe(false);
    expect(response1.value).toBeInstanceOf(testPB.EchoMessage);
    const response2 = await genDuplex.read();
    expect(response2.done).toBe(false);
    expect(response2.value).toBeInstanceOf(testPB.EchoMessage);
    await genDuplex.next(null);
    expect(genDuplex.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisify reading and writing duplex stream - end and destroy with next', async () => {
    const duplexStream = grpcUtils.promisifyDuplexStreamCall<
      testPB.EchoMessage,
      testPB.EchoMessage
    >(client, client.duplexStream);
    const genDuplex = duplexStream();
    await genDuplex.next(null);
    expect(genDuplex.stream.destroyed).toBe(true);
    expect(genDuplex.stream.getPeer()).toBe(`dns:127.0.0.1:${port}`);
  });
  test('promisify reading and writing duplex stream - end and destroy with write and read', async () => {
    const duplexStream = grpcUtils.promisifyDuplexStreamCall<
      testPB.EchoMessage,
      testPB.EchoMessage
    >(client, client.duplexStream);
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
      testPB.EchoMessage,
      testPB.EchoMessage
    >(client, client.duplexStream);
    const genDuplex = duplexStream();
    await genDuplex.read(null);
    const messageTo = new testPB.EchoMessage();
    messageTo.setChallenge('d89f7u983e4d');
    await expect(genDuplex.write(messageTo)).rejects.toThrow(
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
      testPB.EchoMessage,
      testPB.EchoMessage
    >(client, client.duplexStream);
    const genDuplex = duplexStream();
    const messageTo = new testPB.EchoMessage();
    messageTo.setChallenge('error');
    await genDuplex.write(messageTo);
    await expect(genDuplex.read()).rejects.toThrow(grpcErrors.ErrorGRPC);
    expect(genDuplex.stream.destroyed).toBe(true);
    expect(genDuplex.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisify reading and writing duplex stream - error with next', async () => {
    const duplexStream = grpcUtils.promisifyDuplexStreamCall<
      testPB.EchoMessage,
      testPB.EchoMessage
    >(client, client.duplexStream);
    const genDuplex = duplexStream();
    const messageTo = new testPB.EchoMessage();
    messageTo.setChallenge('error');
    await expect(genDuplex.next(messageTo)).rejects.toThrow(
      grpcErrors.ErrorGRPC,
    );
    expect(genDuplex.stream.destroyed).toBe(true);
    expect(genDuplex.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
});
