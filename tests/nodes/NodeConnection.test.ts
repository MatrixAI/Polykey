import type { AddressInfo } from 'net';
import type { ConnectionInfo, Host, Port, TLSConfig } from '@/network/types';
import type { NodeId, NodeInfo } from '@/nodes/types';
import type { Key } from '@/keys/types';
import type { Server } from '@grpc/grpc-js';
import type { ChildProcessWithoutNullStreams } from 'child_process';
import net from 'net';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { destroyed } from '@matrixai/async-init';
import TaskManager from '@/tasks/TaskManager';
import Proxy from '@/network/Proxy';
import NodeConnection from '@/nodes/NodeConnection';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import VaultManager from '@/vaults/VaultManager';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import GRPCClientAgent from '@/agent/GRPCClientAgent';
import ACL from '@/acl/ACL';
import GestaltGraph from '@/gestalts/GestaltGraph';
import Sigchain from '@/sigchain/Sigchain';
import NotificationsManager from '@/notifications/NotificationsManager';
import * as nodesErrors from '@/nodes/errors';
import * as networkErrors from '@/network/errors';
import { poll, promise, promisify } from '@/utils';
import PolykeyAgent from '@/PolykeyAgent';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as GRPCErrors from '@/grpc/errors';
import * as nodesUtils from '@/nodes/utils';
import * as agentErrors from '@/agent/errors';
import * as grpcUtils from '@/grpc/utils';
import { timerStart } from '@/utils';
import * as utils from '@/utils';
import * as testNodesUtils from './utils';
import * as grpcTestUtils from '../grpc/utils';
import * as agentTestUtils from '../agent/utils';
import * as testsUtils from '../utils';

const destroyCallback = async () => {};

// Dummy nodeConnectionManager
// We only need the hole punch function, and frankly it's not used in testing here
// This is really dirty so don't do this outside of testing EVER
const dummyNodeConnectionManager = {
  openConnection: async (_host, _port) => {
    throw Error('This is a dummy function, should not be called');
  },
  withConnF: async () => {
    throw Error('Test, please ignore');
  },
  getSeedNodes: () => [],
  sendHolePunchMessage: async () => {
    throw Error('Test, please ignore');
  },
} as unknown as NodeConnectionManager;


describe(`${NodeConnection.name} test`, () => {
  const logger = new Logger(`${NodeConnection.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  grpcUtils.setLogger(logger.getChild('grpc'));

  const password = 'password';
  const node: NodeInfo = {
    id: nodesUtils.encodeNodeId(testNodesUtils.generateRandomNodeId()),
    chain: {},
  };

  // Server
  let serverDataDir: string;
  let targetNodeId: NodeId;
  let serverKeyRing: KeyRing;
  let serverVaultManager: VaultManager;
  let serverNodeGraph: NodeGraph;
  let serverNodeConnectionManager: NodeConnectionManager;
  let serverNodeManager: NodeManager;
  let serverSigchain: Sigchain;
  let serverACL: ACL;
  let serverGestaltGraph: GestaltGraph;
  let serverDb: DB;
  let serverNotificationsManager: NotificationsManager;
  let serverProxy: Proxy;

  // Client
  let clientDataDir: string;
  let sourceNodeId: NodeId;
  let clientKeyRing: KeyRing;
  const authToken = 'AUTH';
  let clientProxy: Proxy;

  let agentServer: Server;
  let serverPort: Port;
  let tlsConfig: TLSConfig;

  const localHost = '127.0.0.1' as Host;
  let targetPort: Port;
  let sourcePort: Port;

  let serverTLSConfig: TLSConfig;
  let serverTaskManager: TaskManager;

  /**
   * Mock TCP server
   * This is the server that the ReverseProxy will be proxying to
   */
  function tcpServer(end: boolean = false, fastEnd: boolean = false) {
    const { p: serverConnP, resolveP: resolveServerConnP } = promise<void>();
    const { p: serverConnEndP, resolveP: resolveServerConnEndP } =
      promise<void>();
    const { p: serverConnClosedP, resolveP: resolveServerConnClosedP } =
      promise<void>();
    const server = net.createServer(
      {
        allowHalfOpen: false,
      },
      (conn) => {
        logger.info('connection!');
        if (fastEnd) {
          conn.end();
          conn.destroy();
        }
        logger.info(JSON.stringify(conn.address()));
        resolveServerConnP();
        conn.on('end', () => {
          logger.info('ending');
          resolveServerConnEndP();
          conn.end();
          conn.destroy();
        });
        conn.once('close', () => {
          logger.info('closing');
          resolveServerConnClosedP();
        });
        if (end) {
          conn.removeAllListeners('end');
          conn.on('end', () => {
            logger.info('ending');
            resolveServerConnEndP();
            conn.destroy();
          });
          conn.end();
        }
      },
    );
    const serverClose = promisify(server.close).bind(server);
    const serverListen = promisify(server.listen).bind(server);
    const serverHost = () => {
      return (server.address() as AddressInfo).address as Host;
    };
    const serverPort = () => {
      return (server.address() as AddressInfo).port as Port;
    };
    return {
      serverListen,
      serverClose,
      serverConnP,
      serverConnEndP,
      serverConnClosedP,
      serverHost,
      serverPort,
    };
  }

  beforeEach(async () => {
    // Server setup
    serverDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-server'),
    );
    const serverKeysPath = path.join(serverDataDir, 'serverKeys');
    const serverVaultsPath = path.join(serverDataDir, 'serverVaults');
    const serverDbPath = path.join(serverDataDir, 'serverDb');

    serverKeyRing = await KeyRing.createKeyRing({
      password,
      keysPath: serverKeysPath,
      fs: fs,
      logger: logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });

    serverTLSConfig = await testsUtils.createTLSConfig(serverKeyRing.keyPair);

    serverDb = await DB.createDB({
      dbPath: serverDbPath,
      fs: fs,
      logger: logger,
      crypto: {
        key: serverKeyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
    });
    serverACL = await ACL.createACL({
      db: serverDb,
      logger: logger,
    });
    serverSigchain = await Sigchain.createSigchain({
      keyRing: serverKeyRing,
      db: serverDb,
      logger: logger,
    });
    serverGestaltGraph = await GestaltGraph.createGestaltGraph({
      db: serverDb,
      acl: serverACL,
      logger: logger,
    });

    serverProxy = new Proxy({
      authToken: '',
      logger: logger,
    });

    serverNodeGraph = await NodeGraph.createNodeGraph({
      db: serverDb,
      keyRing: serverKeyRing,
      logger,
    });
    serverTaskManager = await TaskManager.createTaskManager({
      db: serverDb,
      lazy: true,
      logger,
    });
    serverNodeConnectionManager = new NodeConnectionManager({
      keyRing: serverKeyRing,
      nodeGraph: serverNodeGraph,
      proxy: serverProxy,
      taskManager: serverTaskManager,
      logger,
    });
    serverNodeManager = new NodeManager({
      db: serverDb,
      sigchain: serverSigchain,
      keyRing: serverKeyRing,
      nodeGraph: serverNodeGraph,
      nodeConnectionManager: serverNodeConnectionManager,
      taskManager: serverTaskManager,
      logger: logger,
    });
    await serverNodeManager.start();
    await serverNodeConnectionManager.start({ nodeManager: serverNodeManager });
    serverVaultManager = await VaultManager.createVaultManager({
      keyRing: serverKeyRing,
      vaultsPath: serverVaultsPath,
      nodeConnectionManager: dummyNodeConnectionManager,
      notificationsManager: serverNotificationsManager,
      db: serverDb,
      acl: serverACL,
      gestaltGraph: serverGestaltGraph,
      fs: fs,
      logger: logger,
    });
    serverNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: serverACL,
        db: serverDb,
        nodeConnectionManager: serverNodeConnectionManager,
        nodeManager: serverNodeManager,
        keyRing: serverKeyRing,
        logger: logger,
      });
    await serverGestaltGraph.setNode(node);
    [agentServer, serverPort] = await agentTestUtils.openTestAgentServer({
      db: serverDb,
      keyRing: serverKeyRing,
      vaultManager: serverVaultManager,
      nodeConnectionManager: dummyNodeConnectionManager,
      nodeManager: serverNodeManager,
      nodeGraph: serverNodeGraph,
      sigchain: serverSigchain,
      notificationsManager: serverNotificationsManager,
      acl: serverACL,
      gestaltGraph: serverGestaltGraph,
      proxy: serverProxy,
      logger: logger,
    });
    await serverProxy.start({
      serverHost: localHost,
      serverPort: serverPort,
      proxyHost: localHost,
      tlsConfig: serverTLSConfig,
    });
    targetPort = serverProxy.getProxyPort();
    targetNodeId = serverKeyRing.getNodeId();

    // Client setup
    clientDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-client'),
    );
    const clientKeysPath = path.join(clientDataDir, 'clientKeys');
    clientKeyRing = await KeyRing.createKeyRing({
      password,
      keysPath: clientKeysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });

    const clientTLSConfig = await testsUtils.createTLSConfig(clientKeyRing.keyPair);

    sourceNodeId = clientKeyRing.getNodeId();
    clientProxy = new Proxy({
      authToken: authToken,
      logger: logger,
    });
    await clientProxy.start({
      forwardHost: localHost,
      tlsConfig: clientTLSConfig,
      proxyHost: localHost,
      serverHost: localHost,
      serverPort: 0 as Port,
    });
    sourcePort = clientProxy.getProxyPort();

    // Other setup
    tlsConfig = await testsUtils.createTLSConfig(keysUtils.generateKeyPair());
  }, globalThis.polykeyStartupTimeout * 2);

  afterEach(async () => {
    await clientProxy.stop();
    await clientKeyRing.stop();
    await clientKeyRing.destroy();
    await fs.promises.rm(clientDataDir, {
      force: true,
      recursive: true,
    });

    await serverACL.stop();
    await serverACL.destroy();
    await serverSigchain.stop();
    await serverSigchain.destroy();
    await serverGestaltGraph.stop();
    await serverGestaltGraph.destroy();
    await serverVaultManager.stop();
    await serverVaultManager.destroy();
    await serverNodeGraph.stop();
    await serverNodeGraph.destroy();
    await serverNodeConnectionManager.stop();
    await serverNodeManager.stop();
    await serverNotificationsManager.stop();
    await serverNotificationsManager.destroy();
    await agentTestUtils.closeTestAgentServer(agentServer);
    await serverProxy.stop();
    await serverKeyRing.stop();
    await serverKeyRing.destroy();
    await serverDb.stop();
    await serverDb.destroy();
    await fs.promises.rm(serverDataDir, {
      force: true,
      recursive: true,
    });
  });

  test('session readiness', async () => {
    logger.debug('session readiness start');
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeId: targetNodeId,
      targetHost: localHost,
      targetPort: targetPort,
      proxy: clientProxy,
      keyRing: clientKeyRing,
      nodeConnectionManager: dummyNodeConnectionManager,
      destroyCallback,
      logger: logger,
      clientFactory: (args) => GRPCClientAgent.createGRPCClientAgent(args),
    });
    await nodeConnection.destroy();
    // Should be a noop
    await nodeConnection.destroy();
    expect(() => {
      nodeConnection.getRootCertChain();
    }).toThrow(nodesErrors.ErrorNodeConnectionDestroyed);
    // Explicitly close the connection such that there's no interference in next test
    await serverProxy.closeConnectionReverse(
      localHost,
      clientProxy.getProxyPort(),
    );
  });
  test('connects to its target (via direct connection)', async () => {
    const conn = await NodeConnection.createNodeConnection({
      targetNodeId: targetNodeId,
      targetHost: localHost,
      targetPort: targetPort,
      proxy: clientProxy,
      keyRing: clientKeyRing,
      nodeConnectionManager: dummyNodeConnectionManager,
      destroyCallback,
      logger: logger,
      clientFactory: async (args) =>
        GRPCClientAgent.createGRPCClientAgent(args),
    });
    // Because the connection will not have enough time to compose before we
    // attempt to acquire the connection info, we need to wait and poll it
    const connInfo = await poll<ConnectionInfo | undefined>(
      async () => {
        return serverProxy.getConnectionInfoByProxy(localHost, sourcePort);
      },
      (e) => {
        if (e instanceof networkErrors.ErrorConnectionNotComposed) return false;
        return !(e instanceof networkErrors.ErrorConnectionNotRunning);
      },
    );
    expect(connInfo).toBeDefined();
    expect(connInfo).toMatchObject({
      remoteNodeId: sourceNodeId,
      remoteCertificates: expect.any(Array),
      localHost: localHost,
      localPort: targetPort,
      remoteHost: localHost,
      remotePort: sourcePort,
    });
    await conn.destroy();
  });
  test('connects to its target but proxies connect first', async () => {
    await clientProxy.openConnectionForward(
      targetNodeId,
      localHost,
      targetPort,
    );
    const conn = await NodeConnection.createNodeConnection({
      targetNodeId: targetNodeId,
      targetHost: localHost,
      targetPort: targetPort,
      proxy: clientProxy,
      keyRing: clientKeyRing,
      nodeConnectionManager: dummyNodeConnectionManager,
      destroyCallback,
      logger: logger,
      clientFactory: async (args) =>
        GRPCClientAgent.createGRPCClientAgent(args),
    });
    // Because the connection will not have enough time to compose before we
    // attempt to acquire the connection info, we need to wait and poll it
    const connInfo = await poll<ConnectionInfo | undefined>(
      async () => {
        return serverProxy.getConnectionInfoByProxy(localHost, sourcePort);
      },
      (e) => {
        if (e instanceof networkErrors.ErrorConnectionNotComposed) return false;
        return !(e instanceof networkErrors.ErrorConnectionNotRunning);
      },
    );
    expect(connInfo).toBeDefined();
    expect(connInfo).toMatchObject({
      remoteNodeId: sourceNodeId,
      remoteCertificates: expect.any(Array),
      localHost: localHost,
      localPort: targetPort,
      remoteHost: localHost,
      remotePort: sourcePort,
    });
    await conn.destroy();
  });
  test('grpcCall after connection drops', async () => {
    let nodeConnection: NodeConnection<GRPCClientAgent> | undefined;
    let polykeyAgent: PolykeyAgent | undefined;
    try {
      polykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: path.join(dataDir, 'PolykeyAgent3'),
        logger: logger,
        networkConfig: {
          proxyHost: localHost,
        },
        keyRingConfig: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      });
      // Have a nodeConnection try to connect to it
      const killSelf = jest.fn();
      nodeConnection = await NodeConnection.createNodeConnection({
        timer: timerStart(2000),
        proxy: clientProxy,
        keyRing: clientKeyRing,
        logger: logger,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback: killSelf,
        targetHost: polykeyAgent.proxy.getProxyHost(),
        targetNodeId: polykeyAgent.keyRing.getNodeId(),
        targetPort: polykeyAgent.proxy.getProxyPort(),
        clientFactory: (args) => GRPCClientAgent.createGRPCClientAgent(args),
      });

      // Resolves if the shutdownCallback was called
      await polykeyAgent.stop();
      await polykeyAgent.destroy();

      const client = nodeConnection.getClient();
      const echoMessage = new utilsPB.EchoMessage().setChallenge(
        'Hello world!',
      );
      await expect(async () => client.echo(echoMessage)).rejects.toThrow(
        agentErrors.ErrorAgentClientDestroyed,
      );
    } finally {
      await polykeyAgent?.stop();
      await polykeyAgent?.destroy();
      await nodeConnection?.destroy();
    }
  });
  test('fails to connect to target (times out)', async () => {
    await expect(
      NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: '128.0.0.1' as Host,
        targetPort: 12345 as Port,
        timer: timerStart(300),
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: (args) => GRPCClientAgent.createGRPCClientAgent(args),
      }),
    ).rejects.toThrow(nodesErrors.ErrorNodeConnectionTimeout);
  });
  test('getRootCertChain', async () => {
    let nodeConnection: NodeConnection<GRPCClientAgent> | undefined;
    try {
      nodeConnection = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
      });

      expect(nodeConnection.getRootCertChain()).toBeDefined();
    } finally {
      await nodeConnection?.destroy();
    }
  });
  test('getExpectedPublicKey', async () => {
    let nodeConnection: NodeConnection<GRPCClientAgent> | undefined;
    try {
      nodeConnection = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
      });

      const expectedPublicKey =
        nodeConnection.getExpectedPublicKey(targetNodeId);
      const publicKey = serverKeyRing.keyPair.publicKey;
      expect(keysUtils.publicKeyToPEM(expectedPublicKey!)).toBe(keysUtils.publicKeyToPEM(publicKey)!);
    } finally {
      await nodeConnection?.destroy();
    }
  });
  test('should call `killSelf if connection is closed based on bad certificate', async () => {
    let proxy: Proxy | undefined;
    let nodeConnection: NodeConnection<GRPCClientAgent> | undefined;
    let server;
    try {
      server = tcpServer();
      proxy = new Proxy({
        logger: logger,
        authToken: '',
      });
      await server.serverListen(0);
      await proxy.start({
        serverHost: server.serverHost(),
        serverPort: server.serverPort(),
        proxyHost: localHost,
        tlsConfig,
      });
      // Have a nodeConnection try to connect to it
      const killSelf = jest.fn();
      const nodeConnectionP = NodeConnection.createNodeConnection({
        timer: timerStart(500),
        proxy: clientProxy,
        keyRing: clientKeyRing,
        logger: logger,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback: killSelf,
        targetHost: proxy.getProxyHost(),
        targetNodeId: targetNodeId,
        targetPort: proxy.getProxyPort(),
        clientFactory: (args) => GRPCClientAgent.createGRPCClientAgent(args),
      });

      // Expecting the connection to fail
      await expect(nodeConnectionP).rejects.toThrow(
        nodesErrors.ErrorNodeConnectionTimeout,
      );
      expect(killSelf.mock.calls.length).toBe(1);
      // Resolves if the shutdownCallback was called
    } finally {
      await server?.serverClose();
      await proxy?.stop();
      await nodeConnection?.destroy();
    }
  });
  test('should call `killSelf if connection is closed before TLS is established', async () => {
    let proxy: Proxy | undefined;
    let server;
    try {
      server = tcpServer(false, true);
      proxy = new Proxy({
        logger: logger,
        authToken: '',
      });
      await server.serverListen(0);
      await proxy.start({
        serverHost: server.serverHost(),
        serverPort: server.serverPort(),
        proxyHost: localHost,
        tlsConfig,
      });
      // Have a nodeConnection try to connect to it
      const killSelf = jest.fn();
      const nodeConnectionP = NodeConnection.createNodeConnection({
        timer: timerStart(500),
        proxy: clientProxy,
        keyRing: clientKeyRing,
        logger: logger,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback: killSelf,
        targetHost: proxy.getProxyHost(),
        targetNodeId: targetNodeId,
        targetPort: proxy.getProxyPort(),
        clientFactory: (args) => GRPCClientAgent.createGRPCClientAgent(args),
      });

      // Expecting the connection to fail
      await expect(nodeConnectionP).rejects.toThrow(
        nodesErrors.ErrorNodeConnectionTimeout,
      );
      expect(killSelf.mock.calls.length).toBe(1);
      // Resolves if the shutdownCallback was called
    } finally {
      await server?.serverClose();
      await proxy?.stop();
    }
  });
  test('should call `killSelf if the Agent is stopped.', async () => {
    let nodeConnection: NodeConnection<GRPCClientAgent> | undefined;
    let polykeyAgent: PolykeyAgent | undefined;
    try {
      polykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: path.join(dataDir, 'PolykeyAgent3'),
        logger: logger,
        networkConfig: {
          proxyHost: localHost,
        },
        keyRingConfig: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      });
      // Have a nodeConnection try to connect to it
      const killSelf = jest.fn();
      nodeConnection = await NodeConnection.createNodeConnection({
        timer: timerStart(500),
        proxy: clientProxy,
        keyRing: clientKeyRing,
        logger: logger,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback: killSelf,
        targetHost: polykeyAgent.proxy.getProxyHost(),
        targetNodeId: polykeyAgent.keyRing.getNodeId(),
        targetPort: polykeyAgent.proxy.getProxyPort(),
        clientFactory: (args) => GRPCClientAgent.createGRPCClientAgent(args),
      });

      // Resolves if the shutdownCallback was called
      await polykeyAgent.stop();
      await polykeyAgent.destroy();
      // Kill callback should've been called
      expect(killSelf.mock.calls.length).toBe(1);
      // Node connection should've destroyed itself in response to connection being destroyed
      expect(nodeConnection[destroyed]).toBe(true);
    } finally {
      await polykeyAgent?.stop();
      await polykeyAgent?.destroy();
      await nodeConnection?.destroy();
    }
  });
  const options = ['exit', 'kill', 'sigkill'];
  test.each(options)(
    "should call `killSelf and throw if the server %s's during testUnaryFail",
    async (option) => {
      let nodeConnection:
        | NodeConnection<grpcTestUtils.GRPCClientTest>
        | undefined;
      let testProxy: Proxy | undefined;
      let testProcess: ChildProcessWithoutNullStreams | undefined;
      try {
        const testProcess = await testsUtils.spawn(
          'ts-node',
          [
            '--project',
            testsUtils.tsConfigPath,
            `${globalThis.testDir}/grpc/utils/testServer.ts`,
          ],
          undefined,
          logger,
        );
        const waitP = promise<string>();
        testProcess.stdout!.on('data', (data) => {
          waitP.resolveP(data);
        });
        testProcess.stderr!.on('data', (data) =>
          waitP.rejectP(data.toString()),
        );

        // Lets make a reverse proxy
        testProxy = new Proxy({
          authToken: '',
          logger: logger,
        });
        await testProxy.start({
          serverHost: '127.0.0.1' as Host,
          serverPort: Number(await waitP.p) as Port,
          proxyHost: localHost,
          tlsConfig: serverTLSConfig,
        });

        // Have a nodeConnection try to connect to it
        const killSelfCheck = jest.fn();
        const killSelfP = promise<null>();
        nodeConnection = await NodeConnection.createNodeConnection({
          timer: timerStart(2000),
          proxy: clientProxy,
          keyRing: clientKeyRing,
          logger: logger,
          nodeConnectionManager: dummyNodeConnectionManager,
          destroyCallback: async () => {
            await killSelfCheck();
            killSelfP.resolveP(null);
          },
          targetNodeId: serverKeyRing.getNodeId(),
          targetHost: testProxy.getProxyHost(),
          targetPort: testProxy.getProxyPort(),
          clientFactory: (args) =>
            grpcTestUtils.GRPCClientTest.createGRPCClientTest(args),
        });

        const client = nodeConnection.getClient();
        const echoMessage = new utilsPB.EchoMessage().setChallenge(option);
        const testP = client.unaryFail(echoMessage);
        // Should throw an error when it fails during call
        await expect(testP).rejects.toThrow(GRPCErrors.ErrorGRPCClientCall);
        // GRPCErrors.ErrorGRPCClientCall '14 UNAVAILABLE: Connection dropped'

        // Kill self callback should've been called
        await killSelfP.p;
        expect(killSelfCheck).toHaveBeenCalled();
      } finally {
        testProcess?.kill(9);
        await testProxy?.stop();
        await nodeConnection?.destroy();
      }
    },
    globalThis.defaultTimeout * 2,
  );
  test.each(options)(
    "should call `killSelf and throw if the server %s's during testStreamFail",
    async (option) => {
      let nodeConnection:
        | NodeConnection<grpcTestUtils.GRPCClientTest>
        | undefined;
      let testProxy: Proxy | undefined;
      let testProcess: ChildProcessWithoutNullStreams | undefined;
      try {
        const testProcess = await testsUtils.spawn(
          'ts-node',
          [
            '--project',
            testsUtils.tsConfigPath,
            `${globalThis.testDir}/grpc/utils/testServer.ts`,
          ],
          undefined,
          logger,
        );
        const waitP = promise<string>();
        testProcess.stdout!.on('data', (data) => {
          waitP.resolveP(data);
        });
        testProcess.stderr!.on('data', (data) =>
          waitP.rejectP(data.toString()),
        );

        // Lets make a reverse proxy
        testProxy = new Proxy({
          authToken: '',
          logger: logger,
        });
        await testProxy.start({
          serverHost: '127.0.0.1' as Host,
          serverPort: Number(await waitP.p) as Port,
          proxyHost: localHost,
          tlsConfig: serverTLSConfig,
        });

        // Have a nodeConnection try to connect to it
        const killSelfCheck = jest.fn();
        const killSelfP = promise<null>();
        nodeConnection = await NodeConnection.createNodeConnection({
          timer: timerStart(2000),
          proxy: clientProxy,
          keyRing: clientKeyRing,
          logger: logger,
          nodeConnectionManager: dummyNodeConnectionManager,
          destroyCallback: async () => {
            await killSelfCheck();
            killSelfP.resolveP(null);
          },
          targetNodeId: serverKeyRing.getNodeId(),
          targetHost: testProxy.getProxyHost(),
          targetPort: testProxy.getProxyPort(),
          clientFactory: (args) =>
            grpcTestUtils.GRPCClientTest.createGRPCClientTest(args),
        });

        const client = nodeConnection.getClient();
        const echoMessage = new utilsPB.EchoMessage().setChallenge(option);
        const testGen = client.serverStreamFail(echoMessage);
        // Should throw an error when it fails during call
        await expect(async () => {
          for await (const _ of testGen) {
            // Do nothing, let it run out
          }
        }).rejects.toThrow(GRPCErrors.ErrorGRPCClientCall);

        // Kill self callback should've been called
        await killSelfP.p;
        expect(killSelfCheck).toHaveBeenCalled();
      } finally {
        testProcess?.kill(9);
        await testProxy?.stop();
        await nodeConnection?.destroy();
      }
    },
    globalThis.defaultTimeout * 2,
  );

  test('existing connection handles a resetRootKeyPair on sending side', async () => {
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      conn = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
        timer: timerStart(2000),
      });
      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));

      // Simulate key change
      clientProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

      // Try again
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
  test('existing connection handles a renewRootKeyPair on sending side', async () => {
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      conn = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
        timer: timerStart(2000),
      });
      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));

      // Simulate key change
      clientProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

      // Try again
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
  test('existing connection handles a resetRootCert on sending side', async () => {
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      conn = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
        timer: timerStart(2000),
      });
      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));

      // Simulate key change
      clientProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

      // Try again
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
  test('existing connection handles a resetRootKeyPair on receiving side', async () => {
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      conn = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
        timer: timerStart(2000),
      });
      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));

      // Simulate key change
      serverProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

      // Try again
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
  test('existing connection handles a renewRootKeyPair on receiving side', async () => {
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      conn = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
        timer: timerStart(2000),
      });
      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));

      // Simulate key change
      serverProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

      // Try again
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
  test('existing connection handles a resetRootCert on receiving side', async () => {
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      conn = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
        timer: timerStart(2000),
      });
      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));

      // Simulate key change
      serverProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

      // Try again
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
  test('new connection handles a resetRootKeyPair on sending side', async () => {
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      // Simulate key change
      clientProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

      conn = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
        timer: timerStart(2000),
      });

      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
  test('new connection handles a renewRootKeyPair on sending side', async () => {
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      // Simulate key change
      clientProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

      conn = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
        timer: timerStart(2000),
      });

      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
  test('new connection handles a resetRootCert on sending side', async () => {
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      // Simulate key change
      clientProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

      conn = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
        timer: timerStart(2000),
      });

      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
  test('new connection handles a resetRootKeyPair on receiving side', async () => {
    // Simulate key change
    serverProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

    const connProm = NodeConnection.createNodeConnection({
      targetNodeId: targetNodeId,
      targetHost: localHost,
      targetPort: targetPort,
      proxy: clientProxy,
      keyRing: clientKeyRing,
      nodeConnectionManager: dummyNodeConnectionManager,
      destroyCallback,
      logger: logger,
      clientFactory: async (args) =>
        GRPCClientAgent.createGRPCClientAgent(args),
      timer: timerStart(2000),
    });

    await expect(connProm).rejects.toThrow(
      nodesErrors.ErrorNodeConnectionTimeout,
    );

    // Connect with the new NodeId
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      conn = await NodeConnection.createNodeConnection({
        targetNodeId: serverKeyRing.getNodeId(),
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
      });
      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
  test('new connection handles a renewRootKeyPair on receiving side', async () => {
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      // Simulate key change
      serverProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

      conn = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
        timer: timerStart(2000),
      });

      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
  test('new connection handles a resetRootCert on receiving side', async () => {
    let conn: NodeConnection<GRPCClientAgent> | undefined;
    try {
      // Simulate key change
      serverProxy.setTLSConfig(await testsUtils.createTLSConfig(keysUtils.generateKeyPair()));

      conn = await NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: localHost,
        targetPort: targetPort,
        proxy: clientProxy,
        keyRing: clientKeyRing,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
        timer: timerStart(2000),
      });

      const client = conn.getClient();
      await client.echo(new utilsPB.EchoMessage().setChallenge('hello!'));
    } finally {
      await conn?.destroy();
    }
  });
});
