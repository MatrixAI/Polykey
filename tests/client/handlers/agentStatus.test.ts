import type { TLSConfig } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import { AgentStatusHandler } from '@/client/handlers/agentStatus';
import RPCClient from '@/rpc/RPCClient';
import * as nodesUtils from '@/nodes/utils';
import WebSocketClient from '@/websockets/WebSocketClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import PolykeyAgent from '@/PolykeyAgent';
import { agentStatus } from '@/client/handlers/clientManifest';
import * as testsUtils from '../../utils';

describe('agentStatus', () => {
  const logger = new Logger('agentStatus test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const host = '127.0.0.1';
  let dataDir: string;
  let pkAgent: PolykeyAgent;
  let clientServer: WebSocketServer;
  let clientClient: WebSocketClient;
  let tlsConfig: TLSConfig;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const nodePath = path.join(dataDir, 'node');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      nodePath,
      password,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(pkAgent.keyRing.keyPair);
  });
  afterEach(async () => {
    await clientServer?.stop(true);
    await clientClient?.destroy(true);
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('get status', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        agentStatus: new AgentStatusHandler({
          pkAgentProm: Promise.resolve(pkAgent),
        }),
      },
      logger: logger.getChild('RPCServer'),
    });
    clientServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) => {
        rpcServer.handleStream(streamPair, connectionInfo);
      },
      host,
      tlsConfig,
      logger,
    });
    clientClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [pkAgent.keyRing.getNodeId()],
      host,
      port: clientServer.getPort(),
      logger,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        agentStatus,
      },
      streamFactory: async () => clientClient.startConnection(),
      logger: logger.getChild('RPCClient'),
    });
    // Doing the test
    const result = await rpcClient.methods.agentStatus({});
    expect(result).toStrictEqual({
      pid: process.pid,
      nodeIdEncoded: nodesUtils.encodeNodeId(pkAgent.keyRing.getNodeId()),
      clientHost: pkAgent.webSocketServerClient.getHost(),
      clientPort: pkAgent.webSocketServerClient.getPort(),
      proxyHost: pkAgent.proxy.getProxyHost(),
      proxyPort: pkAgent.proxy.getProxyPort(),
      agentHost: pkAgent.grpcServerAgent.getHost(),
      agentPort: pkAgent.grpcServerAgent.getPort(),
      forwardHost: pkAgent.proxy.getForwardHost(),
      forwardPort: pkAgent.proxy.getForwardPort(),
      publicKeyJwk: keysUtils.publicKeyToJWK(pkAgent.keyRing.keyPair.publicKey),
      certChainPEM: await pkAgent.certManager.getCertPEMsChainPEM(),
    });
  });
});
