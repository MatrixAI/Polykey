import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../../src/grpc/utils';
import { TestClient } from '../../src/proto/js/Test_grpc_pb';
import * as testPB from '../../src/proto/js/Test_pb';
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
    const data: Array<string> = [];
    for await (const m_ of stream) {
      expect(m_.getChallenge()).toBe(m.getChallenge());
      data.push(m_.getChallenge());
    }
    expect(data.length).toBe(m.getChallenge().length);
    expect(stream.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisify writing client stream', async () => {
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
    await genStream.next(null); // closed stream
    const m_ = await response;
    expect(m_.getChallenge().length).toBe(m.getChallenge().length * 5);
    expect(genStream.stream.getPeer()).toBe(`127.0.0.1:${port}`);
  });
  test('promisify reading and writing duplex stream', async () => {
    const duplexStream = grpcUtils.promisifyDuplexStreamCall<
      testPB.EchoMessage,
      testPB.EchoMessage
    >(client, client.duplexStream);
    const genDuplex = duplexStream();
    const m = new testPB.EchoMessage();
    m.setChallenge('d89f7u983e4d');
    await genDuplex.write(m);
    const response = await genDuplex.read();
    const incoming = response.value.getChallenge();
    expect(incoming).toBe(m.getChallenge());
    expect(genDuplex.stream.getPeer()).toBe(`127.0.0.1:${port}`);
    await genDuplex.write(null);
  });
});
