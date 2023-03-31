import type { TLSConfig } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import { KeysKeyPairResethandler } from '@/client/handlers/keysKeyPairReset';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import PolykeyAgent from '@/PolykeyAgent';
import { NodeManager } from '@/nodes';
import { keysKeyPairReset } from '@/client';
import * as testsUtils from '../../utils';

describe('keysKeyPairReset', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  let dataDir: string;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
  let pkAgent: PolykeyAgent;
  let tlsConfig: TLSConfig;
  let mockedRefreshBuckets: jest.SpyInstance;

  beforeEach(async () => {
    mockedRefreshBuckets = jest.spyOn(NodeManager.prototype, 'resetBuckets');
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const nodePath = path.join(dataDir, 'polykey');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      logger,
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    tlsConfig = await testsUtils.createTLSConfig(pkAgent.keyRing.keyPair);
  });
  afterEach(async () => {
    mockedRefreshBuckets.mockRestore();
    await webSocketServer.stop(true);
    await webSocketClient.destroy(true);
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('resets the root key pair', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        keysKeyPairReset: new KeysKeyPairResethandler({
          certManager: pkAgent.certManager,
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
      expectedNodeIds: [pkAgent.keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.getPort(),
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        keysKeyPairReset,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const rootKeyPair1 = pkAgent.keyRing.keyPair;
    const nodeId1 = pkAgent.keyRing.getNodeId();
    // @ts-ignore - get protected property
    const fwdTLSConfig1 = pkAgent.proxy.tlsConfig;
    const expectedTLSConfig1: TLSConfig = {
      keyPrivatePem: keysUtils.privateKeyToPEM(rootKeyPair1.privateKey),
      certChainPem: await pkAgent.certManager.getCertPEMsChainPEM(),
    };
    const nodeIdStatus1 = (await pkAgent.status.readStatus())!.data.nodeId;
    expect(mockedRefreshBuckets).not.toHaveBeenCalled();
    expect(fwdTLSConfig1).toEqual(expectedTLSConfig1);
    expect(nodeId1.equals(nodeIdStatus1)).toBe(true);
    // Run command
    await rpcClient.methods.keysKeyPairReset({
      password: 'somepassphrase',
    });
    const rootKeyPair2 = pkAgent.keyRing.keyPair;
    const nodeId2 = pkAgent.keyRing.getNodeId();
    // @ts-ignore - get protected property
    const fwdTLSConfig2 = pkAgent.proxy.tlsConfig;
    const expectedTLSConfig2: TLSConfig = {
      keyPrivatePem: keysUtils.privateKeyToPEM(rootKeyPair2.privateKey),
      certChainPem: await pkAgent.certManager.getCertPEMsChainPEM(),
    };
    const nodeIdStatus2 = (await pkAgent.status.readStatus())!.data.nodeId;
    expect(mockedRefreshBuckets).toHaveBeenCalled();
    expect(fwdTLSConfig2).toEqual(expectedTLSConfig2);
    expect(rootKeyPair2.privateKey).not.toBe(rootKeyPair1.privateKey);
    expect(rootKeyPair2.publicKey).not.toBe(rootKeyPair1.publicKey);
    expect(nodeId1).not.toBe(nodeId2);
    expect(nodeIdStatus1).not.toBe(nodeIdStatus2);
    expect(nodeId2.equals(nodeIdStatus2)).toBe(true);
  });
});
