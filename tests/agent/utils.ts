import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/nodes/types';
import * as grpc from '@grpc/grpc-js';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { createAgentService, GRPCClientAgent, AgentService } from '@/agent';
import { IAgentServer } from '@/proto/js/Agent_grpc_pb';
import { VaultManager } from '@/vaults';
import { NodeManager } from '@/nodes';
import { promisify } from '@/utils';
import { Sigchain } from '@/sigchain';
import { NotificationsManager } from '@/notifications';

async function openTestAgentServer({
  vaultManager,
  nodeManager,
  sigchain,
  notificationsManager,
}: {
  vaultManager: VaultManager;
  nodeManager: NodeManager;
  sigchain: Sigchain;
  notificationsManager: NotificationsManager;
}) {
  const agentService: IAgentServer = createAgentService({
    vaultManager,
    nodeManager,
    sigchain: sigchain,
    notificationsManager: notificationsManager,
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
    nodeId: 'NODEID' as NodeId,
    host: '127.0.0.1' as Host,
    port: port as Port,
    logger: logger,
  });

  await agentClient.start({
    timeout: 30000,
  });

  return agentClient;
}

async function closeTestAgentClient(client: GRPCClientAgent) {
  await client.stop();
}

export {
  openTestAgentServer,
  closeTestAgentServer,
  openTestAgentClient,
  closeTestAgentClient,
};
