import type { Host, Port, ProxyConfig } from '@/network/types';
import type { IAgentServiceServer } from '@/proto/js/polykey/v1/agent_service_grpc_pb';
import type { KeyRing } from '@/keys';
import type { VaultManager } from '@/vaults';
import type { NodeConnectionManager, NodeGraph, NodeManager } from '@/nodes';
import type { Sigchain } from '@/sigchain';
import type { NotificationsManager } from '@/notifications';
import type { ACL } from '@/acl';
import type { GestaltGraph } from '@/gestalts';
import type { NodeId } from 'nodes/types';
import type Proxy from 'network/Proxy';
import type { DB } from '@matrixai/db';
import type { Server } from '@grpc/grpc-js';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { promisify } from '@/utils';
import {
  AgentServiceService,
  createAgentService,
  GRPCClientAgent,
} from '@/agent';
import { timerStart } from '@/utils';
import * as testNodesUtils from '../nodes/utils';

async function openTestAgentServer({
  keyRing,
  vaultManager,
  nodeConnectionManager,
  nodeManager,
  nodeGraph,
  sigchain,
  notificationsManager,
  acl,
  gestaltGraph,
  proxy,
  db,
  logger,
}: {
  keyRing: KeyRing;
  vaultManager: VaultManager;
  nodeConnectionManager: NodeConnectionManager;
  nodeManager: NodeManager;
  nodeGraph: NodeGraph;
  sigchain: Sigchain;
  notificationsManager: NotificationsManager;
  acl: ACL;
  gestaltGraph: GestaltGraph;
  proxy: Proxy;
  db: DB;
  logger: Logger;
}): Promise<[Server, Port]> {
  const agentService: IAgentServiceServer = createAgentService({
    keyRing,
    vaultManager,
    nodeManager,
    nodeGraph,
    sigchain,
    notificationsManager,
    nodeConnectionManager,
    acl,
    gestaltGraph,
    proxy,
    db,
    logger,
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

async function openTestAgentClient(
  port: number,
  nodeId?: NodeId,
  proxyConfig?: ProxyConfig,
): Promise<GRPCClientAgent> {
  const logger = new Logger('AgentClientTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  return await GRPCClientAgent.createGRPCClientAgent({
    nodeId: nodeId ?? testNodesUtils.generateRandomNodeId(),
    host: '127.0.0.1' as Host,
    port: port as Port,
    logger: logger,
    destroyCallback: async () => {},
    proxyConfig,
    timer: timerStart(30000),
  });
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
