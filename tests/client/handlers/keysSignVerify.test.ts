import type { TLSConfig } from '@/network/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type Sigchain from '../../../src/sigchain/Sigchain';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import { keysSign, KeysSignHandler } from '@/client/handlers/keysSign';
import { keysVerify, KeysVerifyHandler } from '@/client/handlers/keysVerify';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import IdentitiesManager from '@/identities/IdentitiesManager';
import { publicKeyToJWK } from '@/keys/utils';
import * as testsUtils from '../../utils';

describe('keysSignVerify', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    await webSocketServer.stop(true);
    await webSocketClient.destroy(true);
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('signs and verifies with root keypair', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        keysSign: new KeysSignHandler({
          keyRing,
        }),
        keysVerify: new KeysVerifyHandler({
          keyRing,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        keysSign,
        keysVerify,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const data = Buffer.from('abc');
    const signed = await rpcClient.methods.keysSign({
      data: data.toString('binary'),
    });
    const publicKeyJWK = publicKeyToJWK(keyRing.keyPair.publicKey);
    const response = await rpcClient.methods.keysVerify({
      data: data.toString('binary'),
      signature: signed.signature,
      publicKeyJwk: publicKeyJWK,
    });
    expect(response.success).toBeTruthy();
  });
});
