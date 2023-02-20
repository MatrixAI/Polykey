import type { TLSConfig } from '@/network/types';
import type { Server } from 'https';
import type { WebSocketServer } from 'ws';
import type { ClientManifest } from '@/RPC/types';
import type { JSONValue } from '@/types';
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
import ClientServer from '@/clientRPC/ClientServer';
import * as testsUtils from '../utils/index';

describe('websocket', () => {
  const logger = new Logger('websocket test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const loudLogger = new Logger('websocket test', LogLevel.DEBUG, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  let dataDir: string;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let server: Server;
  let wss: WebSocketServer;
  const host = '127.0.0.2';
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
      public async handle(input: JSONValue): Promise<JSONValue> {
        return input;
      }
    }
    class Test2 extends UnaryHandler {
      public async handle(): Promise<JSONValue> {
        return { hello: 'not world' };
      }
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

  test('Using uws', async () => {
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    const server = await ClientServer.createClientServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        void streamPair.readable
          .pipeTo(streamPair.writable)
          .catch(() => {})
          .finally(() => logger.info('STREAM HANDLING ENDED'));
      },
      basePath: dataDir,
      tlsConfig,
      host,
      logger: loudLogger.getChild('server'),
    });
    logger.info(`Server started on port ${server.port}`);

    const websocket1 = await clientRPCUtils.startConnection(
      host,
      server.port,
      logger.getChild('Connection'),
    );

    // Const websocket2 = await clientRPCUtils.startConnection(
    //   host,
    //   server.port,
    //   logger.getChild('Connection'),
    // );

    logger.info('doing things');
    const writer1 = websocket1.writable.getWriter();
    // Const writer2 = websocket2.writable.getWriter();
    await writer1.write(Buffer.from('1request1'));
    // Await writer2.write(Buffer.from('2request1'));
    await writer1.write(Buffer.from('1request2'));
    // Await writer2.write(Buffer.from('2request2'));
    await writer1.close();
    // Await writer2.close();
    for await (const val of websocket1.readable) {
      logger.info(`Client1 message: ${val.toString()}`);
    }
    // For await (const val of websocket2.readable) {
    //   logger.info(`Client2 message: ${val.toString()}`);
    // }
    logger.info('ending');
    await server.destroy();
  });
});
