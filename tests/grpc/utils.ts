import type { NodeId } from '../../src/nodes/types';

import * as grpc from '@grpc/grpc-js';
import * as testPB from '../../src/proto/js/Test_pb';

import {
  TestService,
  ITestServer,
  TestClient,
} from '../../src/proto/js/Test_grpc_pb';
import { utils as grpcUtils } from '../../src/grpc';
import { promisify } from '../../src/utils';

const testService: ITestServer = {
  unary: async (
    call: grpc.ServerUnaryCall<testPB.EchoMessage, testPB.EchoMessage>,
    callback: grpc.sendUnaryData<testPB.EchoMessage>,
  ): Promise<void> => {
    const m = new testPB.EchoMessage();
    m.setChallenge(call.request.getChallenge());
    callback(null, m);
  },
  serverStream: async (
    call: grpc.ServerWritableStream<testPB.EchoMessage, testPB.EchoMessage>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);

    const req = call.request;
    const m = new testPB.EchoMessage();

    for (let i = 0; i < req.getChallenge().length; i++) {
      m.setChallenge(req.getChallenge());
      await genWritable.next(m);
    }
    await genWritable.next(null);
    // genWritable.stream.end();
  },
  clientStream: async (
    call: grpc.ServerReadableStream<testPB.EchoMessage, testPB.EchoMessage>,
    callback: grpc.sendUnaryData<testPB.EchoMessage>,
  ): Promise<void> => {
    const genReadable = grpcUtils.generatorReadable(call);

    let data = '';
    try {
      for await (const m of genReadable) {
        const d = m.getChallenge();
        data += d;
      }
    } catch (err) {
      console.log('Error:', err.message);
      callback(err, null);
    }
    const response = new testPB.EchoMessage();
    response.setChallenge(data);
    callback(null, response);
  },
  duplexStream: async (
    call: grpc.ServerDuplexStream<testPB.EchoMessage, testPB.EchoMessage>,
  ) => {
    const genDuplex = grpcUtils.generatorDuplex(call);

    const m = new testPB.EchoMessage();
    const response = await genDuplex.read();
    if (response === null) return;
    const incoming = response.value.getChallenge();
    m.setChallenge(incoming);
    await genDuplex.write(m);
    await genDuplex.next(null);
  },
};

async function openTestServer(): Promise<[grpc.Server, number]> {
  const server = new grpc.Server();
  server.addService(TestService, testService);
  const bindAsync = promisify(server.bindAsync).bind(server);
  const port = await bindAsync(
    `127.0.0.1:0`,
    grpc.ServerCredentials.createInsecure(),
  );
  server.start();
  return [server, port];
}

async function closeTestServer(server: grpc.Server): Promise<void> {
  const tryShutdown = promisify(server.tryShutdown).bind(server);
  await tryShutdown();
}

async function openTestClient(port: number): Promise<TestClient> {
  const client = new TestClient(
    `127.0.0.1:${port}`,
    grpc.ChannelCredentials.createInsecure(),
  );
  const waitForReady = promisify(client.waitForReady).bind(client);
  await waitForReady(Infinity);
  return client;
}

function closeTestClient(client: TestClient): void {
  client.close();
}

async function openTestClientSecure(
  nodeId: NodeId,
  port: number,
  keyPrivatePem,
  certChainPem,
): Promise<TestClient> {
  const clientOptions = {
    // prevents complaints with having an ip address as the server name
    'grpc.ssl_target_name_override': nodeId,
  };
  const clientCredentials = grpcUtils.clientCredentials(
    keyPrivatePem,
    certChainPem,
  );
  const client = new TestClient(
    `127.0.0.1:${port}`,
    clientCredentials,
    clientOptions,
  );
  const waitForReady = promisify(client.waitForReady).bind(client);
  await waitForReady(Infinity);
  return client;
}

function closeTestClientSecure(client: TestClient) {
  client.close();
}

async function openTestServerSecure(
  keyPrivatePem,
  certChainPem,
): Promise<[grpc.Server, number]> {
  const server = new grpc.Server();
  server.addService(TestService, testService);
  const bindAsync = promisify(server.bindAsync).bind(server);
  const serverCredentials = grpcUtils.serverCredentials(
    keyPrivatePem,
    certChainPem,
  );
  const port = await bindAsync(`127.0.0.1:0`, serverCredentials);
  server.start();
  return [server, port];
}

async function closeTestServerSecure(server: grpc.Server): Promise<void> {
  const tryShutdown = promisify(server.tryShutdown).bind(server);
  await tryShutdown();
}

export {
  TestService,
  testService,
  openTestServer,
  closeTestServer,
  openTestClient,
  closeTestClient,
  openTestServerSecure,
  closeTestServerSecure,
  openTestClientSecure,
  closeTestClientSecure,
};
