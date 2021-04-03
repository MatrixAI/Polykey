import type { NodeId } from '@/nodes/types';

import * as grpc from '@grpc/grpc-js';
import { TestService, ITestServer, TestClient } from '@/proto/js/Test_grpc_pb';
import * as testPB from '@/proto/js/Test_pb';
import { utils as grpcUtils } from '@/grpc';
import { promisify } from '@/utils';

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
    const m = new testPB.EchoMessage();
    m.setChallenge(call.request.getChallenge());
    const write = promisify(call.write).bind(call);
    await write(m);
    await write(m);
    call.end();
  },
  clientStream: async (
    call: grpc.ServerReadableStream<testPB.EchoMessage, testPB.EchoMessage>,
    callback: grpc.sendUnaryData<testPB.EchoMessage>,
  ): Promise<void> => {
    let m;
    call.on('data', (d) => {
      m = d;
    });
    call.on('end', () => {
      const m_ = new testPB.EchoMessage();
      m_.setChallenge(m.getChallenge());
      callback(null, m_);
    });
  },
  duplexStream: async (
    call: grpc.ServerDuplexStream<testPB.EchoMessage, testPB.EchoMessage>,
  ) => {
    const write = promisify(call.write).bind(call);
    call.on('data', async (m) => {
      const m_ = new testPB.EchoMessage();
      m_.setChallenge(m.getChallenge());
      await write(m_);
    });
    call.on('end', () => {
      call.end();
    });
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
