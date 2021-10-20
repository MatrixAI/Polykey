import * as grpc from '@grpc/grpc-js';

import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import {
  ClientServiceService,
  IClientServiceServer,
  ClientServiceClient,
} from '@/proto/js/polykey/v1/client_service_grpc_pb';
import { createClientService } from '@/client';
import PolykeyClient from '@/PolykeyClient';
import { promisify } from '@/utils';
import { SessionCredentials, SessionToken } from '@/sessions/types';
import { PolykeyAgent } from '@';
import * as grpcUtils from '@/grpc/utils';

async function openTestClientServer({
  polykeyAgent,
  secure,
}: {
  polykeyAgent: PolykeyAgent;
  secure?: boolean;
}) {
  const _secure = secure ?? true;
  const clientService: IClientServiceServer = createClientService({
    polykeyAgent,
    keyManager: polykeyAgent.keys,
    vaultManager: polykeyAgent.vaults,
    nodeManager: polykeyAgent.nodes,
    identitiesManager: polykeyAgent.identities,
    gestaltGraph: polykeyAgent.gestalts,
    sessionManager: polykeyAgent.sessions,
    notificationsManager: polykeyAgent.notifications,
    discovery: polykeyAgent.discovery,
    fwdProxy: polykeyAgent.fwdProxy,
    revProxy: polykeyAgent.revProxy,
    grpcServer: polykeyAgent.clientGrpcServer,
  });

  const callCredentials = _secure
    ? grpcUtils.serverSecureCredentials(
        polykeyAgent.keys.getRootKeyPairPem().privateKey,
        await polykeyAgent.keys.getRootCertChainPem(),
      )
    : grpcUtils.serverInsecureCredentials();

  const server = new grpc.Server();
  server.addService(ClientServiceService, clientService);
  const bindAsync = promisify(server.bindAsync).bind(server);
  const port = await bindAsync(`127.0.0.1:0`, callCredentials);
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

  const pkc: PolykeyClient = await PolykeyClient.createPolykeyClient({
    nodePath,
    fs,
    logger,
  });
  await pkc.start({
    timeout: 30000,
  });

  return pkc;
}

async function closeTestClientClient(client: PolykeyClient) {
  await client.stop();
}

async function openSimpleClientClient(
  port: number,
): Promise<ClientServiceClient> {
  const client = new ClientServiceClient(
    `127.0.0.1:${port}`,
    grpc.ChannelCredentials.createInsecure(),
  );
  const waitForReady = promisify(client.waitForReady).bind(client);
  await waitForReady(Infinity);
  return client;
}

function closeSimpleClientClient(client: ClientServiceClient): void {
  client.close();
}

function createCallCredentials(token: SessionToken): SessionCredentials {
  return {
    credentials: grpc.CallCredentials.createFromMetadataGenerator(
      (_params, callback) => {
        const meta = new grpc.Metadata();
        meta.add('Authorization', `Bearer: ${token}`);
        callback(null, meta);
      },
    ),
  } as SessionCredentials;
}

export {
  openTestClientServer,
  closeTestClientServer,
  openTestClientClient,
  closeTestClientClient,
  openSimpleClientClient,
  closeSimpleClientClient,
  createCallCredentials,
};
