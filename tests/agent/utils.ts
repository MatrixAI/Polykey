import type { Host, Port } from '@/network/types';

import type { IAgentServiceServer } from '@/proto/js/polykey/v1/agent_service_grpc_pb';
import type { KeyManager } from '@/keys';
import type { VaultManager } from '@/vaults';
import type { NodeGraph, NodeConnectionManager, NodeManager } from '@/nodes';
import type { Sigchain } from '@/sigchain';
import type { NotificationsManager } from '@/notifications';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { promisify } from '@/utils';
import {
  createAgentService,
  GRPCClientAgent,
  AgentServiceService,
} from '@/agent';
import * as testUtils from '../utils';

async function openTestAgentServer({
  keyManager,
  vaultManager,
  nodeConnectionManager,
  nodeManager,
  nodeGraph,
  sigchain,
  notificationsManager,
}: {
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeConnectionManager: NodeConnectionManager;
  nodeManager: NodeManager;
  nodeGraph: NodeGraph;
  sigchain: Sigchain;
  notificationsManager: NotificationsManager;
}) {
  const agentService: IAgentServiceServer = createAgentService({
    keyManager,
    vaultManager,
    nodeManager,
    nodeGraph,
    sigchain: sigchain,
    notificationsManager: notificationsManager,
    nodeConnectionManager: nodeConnectionManager,
  });

  const server = new grpc.Server();
  server.addService(AgentServiceService, agentService);
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
  const agentClient = await GRPCClientAgent.createGRPCClientAgent({
    nodeId: testUtils.generateRandomNodeId(),
    host: '127.0.0.1' as Host,
    port: port as Port,
    logger: logger,
    destroyCallback: async () => {},
    timeout: 30000,
  });
  return agentClient;
}

async function closeTestAgentClient(client: GRPCClientAgent) {
  await client.destroy();
}

export {
  openTestAgentServer,
  closeTestAgentServer,
  openTestAgentClient,
  closeTestAgentClient,
};
