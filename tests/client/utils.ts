import * as grpc from '@grpc/grpc-js';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { ClientService, IClientServer } from '@/proto/js/Client_grpc_pb';
import { createClientService } from '@/client';
import PolykeyClient from '@/PolykeyClient';
import { VaultManager } from '@/vaults';
import { NodeManager } from '@/nodes';
import { promisify } from '@/utils';
import { KeyManager } from '@/keys';

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

export {
  openTestClientServer,
  closeTestClientServer,
  openTestClientClient,
  closeTestClientClient,
};
