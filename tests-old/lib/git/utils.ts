import * as grpc from '@grpc/grpc-js';

import { promisify } from '../../src/utils';
import { AgentService } from '../../src/agent';
import { IAgentServer, AgentClient } from '../../src/proto/js/Agent_grpc_pb';

async function openGrpcServer(
  service: typeof AgentService,
  agentService: IAgentServer,
  port: number = 0,
): Promise<[grpc.Server, number]> {
  const server = new grpc.Server();
  server.addService(service, agentService);
  const bindAsync = promisify(server.bindAsync).bind(server);
  const boundPort = await bindAsync(
    `127.0.0.1:${port}`,
    grpc.ServerCredentials.createInsecure(),
  );
  server.start();
  return [server, boundPort];
}

async function closeGrpcServer(server: grpc.Server): Promise<void> {
  const tryShutdown = promisify(server.tryShutdown).bind(server);
  await tryShutdown();
}

async function openGrpcClient(port: number): Promise<AgentClient> {
  const client = new AgentClient(
    `127.0.0.1:${port}`,
    grpc.ChannelCredentials.createInsecure(),
  );
  const waitForReady = promisify(client.waitForReady).bind(client);
  await waitForReady(Date.now() + 30000);
  return client;
}

function closeGrpcClient(client: AgentClient): void {
  client.close();
}

export { openGrpcServer, closeGrpcServer, openGrpcClient, closeGrpcClient };
