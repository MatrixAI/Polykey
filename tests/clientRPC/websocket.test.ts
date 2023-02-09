import type { TLSConfig } from '@/network/types';
import type { Server } from 'https';
import type { WebSocketServer } from 'ws';
import type { ClientManifest } from '@/RPC/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createServer } from 'https';
import Logger, { LogLevel, StreamHandler, formatting } from '@matrixai/logger';
import RPCServer from '@/RPC/RPCServer';
import RPCClient from '@/RPC/RPCClient';
import { KeyRing } from '@/keys/index';
import * as clientRPCUtils from '@/clientRPC/utils';
import { UnaryHandler } from '@/RPC/handlers';
import { UnaryCaller } from '@/RPC/callers';
import * as testsUtils from '../utils/index';

describe('websocket', () => {
  const logger = new Logger('websocket test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  let dataDir: string;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let server: Server;
  let wss: WebSocketServer;
  const host = '127.0.0.1';
  let port: number;
  let rpcServer: RPCServer;
  let rpcClient_: RPCClient<ClientManifest>;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      keysPath: keysPath,
      password: 'password',
      logger: logger.getChild('keyRing'),
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    server = createServer({
      cert: tlsConfig.certChainPem,
      key: tlsConfig.keyPrivatePem,
    });
    port = await clientRPCUtils.listen(server, host);
  });
  afterEach(async () => {
    await rpcClient_?.destroy();
    await rpcServer?.destroy();
    wss?.close();
    server.close();
    await keyRing.stop();
    await fs.promises.rm(dataDir, { force: true, recursive: true });
  });

  test('websocket should work with RPC', async () => {
    // Setting up server
    class Test1 extends UnaryHandler {
      public handle = async (params) => {
        return params;
      };
    }
    class Test2 extends UnaryHandler {
      public handle = async () => {
        return { hello: 'not world' };
      };
    }
    rpcServer = await RPCServer.createRPCServer({
      manifest: {
        test1: new Test1({}),
        test2: new Test2({}),
      },
      logger: logger.getChild('RPCServer'),
    });
    wss = clientRPCUtils.createClientServer(
      server,
      rpcServer,
      logger.getChild('client'),
    );

    // Setting up client
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        test1: new UnaryCaller(),
        test2: new UnaryCaller(),
      },
      logger: logger.getChild('RPCClient'),
      streamPairCreateCallback: async () => {
        return clientRPCUtils.startConnection(
          host,
          port,
          logger.getChild('Connection'),
        );
      },
    });
    rpcClient_ = rpcClient;

    // Making the call
    await expect(
      rpcClient.methods.test1({ hello: 'world2' }),
    ).resolves.toStrictEqual({ hello: 'world2' });
    await expect(
      rpcClient.methods.test2({ hello: 'world2' }),
    ).resolves.toStrictEqual({ hello: 'not world' });
    await expect(
      rpcClient.unaryCaller('test3', { hello: 'world2' }),
    ).toReject();
  });
});
