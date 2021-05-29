import * as grpc from '@grpc/grpc-js';

import { ClientService, IClientServer } from '@/proto/js/Client_grpc_pb';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { ClientClient } from '@/proto/js/Client_grpc_pb';
import { IdentitiesManager } from '@/identities';
import { createClientService } from '@/client';
import PolykeyClient from '@/PolykeyClient';
import { SessionManager } from '@/session';
import { GestaltGraph } from '@/gestalts';
import { VaultManager } from '@/vaults';
import { NodeManager } from '@/nodes';
import { KeyManager } from '@/keys';
import { promisify } from '@/utils';

async function openTestClientServer({
  keyManager,
  vaultManager,
  nodeManager,
  identitiesManager,
  gestaltGraph,
  sessionManager,
}: {
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeManager: NodeManager;
  identitiesManager: IdentitiesManager;
  gestaltGraph: GestaltGraph;
  sessionManager: SessionManager;
}) {
  const clientService: IClientServer = createClientService({
    keyManager,
    vaultManager,
    nodeManager,
    identitiesManager,
    gestaltGraph,
    sessionManager,
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

async function openSimpleClientClient(port: number): Promise<ClientClient> {
  const client = new ClientClient(
    `127.0.0.1:${port}`,
    grpc.ChannelCredentials.createInsecure(),
  );
  const waitForReady = promisify(client.waitForReady).bind(client);
  await waitForReady(Infinity);
  return client;
}

function closeSimpleClientClient(client: ClientClient): void {
  client.close();
}

export {
  openTestClientServer,
  closeTestClientServer,
  openTestClientClient,
  closeTestClientClient,
  openSimpleClientClient,
  closeSimpleClientClient,
};
