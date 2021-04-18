import * as grpc from '@grpc/grpc-js';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { TestService, ITestServer, TestClient } from '@/proto/js/Test_grpc_pb';
import { createAgentService, GRPCClientAgent, AgentService } from '@/agent';
import { ClientService, IClientServer } from '@/proto/js/Client_grpc_pb';
import { IAgentServer } from '@/proto/js/Agent_grpc_pb';
import { createClientService } from '@/client';
import * as testPB from '@/proto/js/Test_pb';
import PolykeyClient from '@/PolykeyClient';
import { VaultManager } from '@/vaults';
import { NodeManager } from '@/nodes';
import { promisify } from '@/utils';
import { KeyManager } from '@/keys';

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

const openTestServer = async () => {
  const server = new grpc.Server();
  server.addService(TestService, testService);
  const bindAsync = promisify(server.bindAsync).bind(server);
  const port = await bindAsync(
    `127.0.0.1:0`,
    grpc.ServerCredentials.createInsecure(),
  );
  server.start();
  return [server, port];
};

const closeTestServer = async (server) => {
  const tryShutdown = promisify(server.tryShutdown).bind(server);
  await tryShutdown();
};

const openTestClient = async (port: number): Promise<TestClient> => {
  const client = new TestClient(
    `127.0.0.1:${port}`,
    grpc.ChannelCredentials.createInsecure(),
  );
  const waitForReady = promisify(client.waitForReady).bind(client);
  await waitForReady(Infinity);
  return client;
};

const closeTestClient = async (client) => {
  client.close();
};

async function openTestClientServer({
  keyManager,
  vaultManager,
  nodeManager,
}: {
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeManager: NodeManager;
}) {
  const clientService: IClientServer = createClientService({
    keyManager,
    vaultManager,
    nodeManager,
  });

  const server = new grpc.Server();
  server.addService(ClientService, clientService);
  const bindAsync = promisify(server.bindAsync).bind(server);
  const port = await bindAsync(
    `127.0.0.1:0`,
    grpc.ServerCredentials.createInsecure(),
  );
  server.start();
  return [server, port];
}

const closeTestClientServer = async (server) => {
  const tryShutdown = promisify(server.tryShutdown).bind(server);
  await tryShutdown();
};

async function openTestClientClient(nodePath) {
  const logger = new Logger('ClientClientTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const fs = require('fs/promises');
  // const nodePath = path.resolve(utils.getDefaultNodePath());

  const pkc: PolykeyClient = new PolykeyClient({
    nodePath,
    fs,
    logger,
  });
  await pkc.start({
    credentials: grpc.ChannelCredentials.createInsecure(),
    timeout: 30000,
  });

  return pkc;
}

async function closeTestClientClient(client: PolykeyClient) {
  await client.stop();
}

async function openTestAgentServer({
  keyManager,
  vaultManager,
  nodeManager,
}: {
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeManager: NodeManager;
}) {
  const agentService: IAgentServer = createAgentService({
    keyManager,
    vaultManager,
    nodeManager,
  });

  const server = new grpc.Server();
  server.addService(AgentService, agentService);
  const bindAsync = promisify(server.bindAsync).bind(server);
  const port = await bindAsync(
    `127.0.0.1:0`,
    grpc.ServerCredentials.createInsecure(),
  );
  server.start();
  return [server, port];
}

async function closeTestAgentServer(server) {
  const tryShutdown = promisify(server.tryShutdown).bind(server);
  await tryShutdown();
}

async function openTestAgentClient(port: number): Promise<GRPCClientAgent> {
  const logger = new Logger('AgentClientTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const agentClient = new GRPCClientAgent({
    host: '127.0.0.1',
    port: port,
    logger: logger,
  });

  await agentClient.start({
    credentials: grpc.ChannelCredentials.createInsecure(),
    timeout: 30000,
  });

  return agentClient;
}

async function closeTestAgentClient(client: GRPCClientAgent) {
  await client.stop();
}

export {
  openTestServer,
  closeTestServer,
  openTestClient,
  closeTestClient,
  openTestClientServer,
  closeTestClientServer,
  openTestClientClient,
  closeTestClientClient,
  openTestAgentServer,
  closeTestAgentServer,
  openTestAgentClient,
  closeTestAgentClient,
};
