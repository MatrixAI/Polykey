import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '@/grpc/utils';
import { TestClient } from '@/proto/js/Test_grpc_pb';
import * as testPB from '@/proto/js/Test_pb';
import * as utils from './utils';

describe('utils', () => {
  let client: TestClient, server: grpc.Server, port: number;
  beforeAll(async () => {
    [server, port] = await utils.openTestServer();
    client = await utils.openTestClient(port);
  });
  afterAll(async () => {
    utils.closeTestClient(client);
    await utils.closeTestServer(server);
  });
  test('promisify client unary call', async () => {
    const unary = grpcUtils.promisifyUnaryCall<testPB.EchoMessage>(
      client,
      client.unary,
    );
    const m = new testPB.EchoMessage();
    m.setChallenge('s8dfusdifoj');
    const pCall = unary(m);
    expect(pCall.call.getPeer()).toBe(`dns:127.0.0.1:${port}`);
    const m_ = await pCall;
    expect(m_.getChallenge()).toBe(m.getChallenge());
  });
  test('promisify reading server stream', async () => {
    const serverStream = grpcUtils.promisifyReadableStreamCall<testPB.EchoMessage>(
      client,
      client.serverStream,
    );
    const m = new testPB.EchoMessage();
    m.setChallenge('987ds8f7');
    const stream = serverStream(m);
    for await (const m_ of stream) {
      expect(m_.getChallenge()).toBe(m.getChallenge());
    }
    expect(stream.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisify writing client stream', async () => {
    const clientStream = grpcUtils.promisifyWritableStreamCall<
      testPB.EchoMessage,
      testPB.EchoMessage
    >(client, client.clientStream);
    const [stream, response] = clientStream();
    const m = new testPB.EchoMessage();
    m.setChallenge('d89f7u983e4d');
    await stream.next(m);
    await stream.next(m);
    await stream.next(null); // closed stream
    const m_ = await response;
    expect(m_.getChallenge()).toBe(m.getChallenge());
    expect(stream.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisify reading and writing duplex stream', async () => {
    const duplexStream = grpcUtils.promisifyDuplexStreamCall<
      testPB.EchoMessage,
      testPB.EchoMessage
    >(client, client.duplexStream);
    const stream = duplexStream();
    const m = new testPB.EchoMessage();
    m.setChallenge('d89f7u983e4d');
    const m_ = await stream.next(m);
    expect(m_.value!.getChallenge()).toBe(m.getChallenge());
    await stream.next(null);
    expect(stream.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
});
