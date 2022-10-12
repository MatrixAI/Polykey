import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import KeyRing from '@/keys/KeyRing';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import keysKeyPairRoot from '@/client/service/keysKeyPairRoot';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as keysPB from '@/proto/js/polykey/v1/keys/keys_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '@/client/utils/utils';
import * as keysUtils from '@/keys/utils';

describe('keysKeyPairRoot', () => {
  const logger = new Logger('keysKeyPairRoot test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let dataDir: string;
  let keyRing: KeyRing;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
    });
    const clientService = {
      keysKeyPairRoot: keysKeyPairRoot({
        authenticate,
        keyRing,
        logger,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[ClientServiceService, clientService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientClient.createGRPCClientClient({
      nodeId: keyRing.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets the root keypair', async () => {
    const request = new utilsPB.EmptyMessage();
    const response = await grpcClient.keysKeyPairRoot(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(keysPB.KeyPair);
    const keyPairPem = keysUtils.keyPairToPEM(keyRing.keyPair)
    expect(response.getPublic()).toBe(keyPairPem.publicKey);
    expect(response.getPrivate()).toBe(keyPairPem.privateKey);
  });
});
