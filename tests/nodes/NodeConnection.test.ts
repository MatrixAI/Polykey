import type { AddressInfo } from 'net';
import type { ConnectionInfo, Host, Port, TLSConfig } from '@/network/types';
import type { NodeId, NodeInfo } from '@/nodes/types';
import net from 'net';
import os from 'os';
import path from 'path';
import fs from 'fs';
import * as child_process from 'child_process';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { destroyed } from '@matrixai/async-init';
import ReverseProxy from '@/network/ReverseProxy';
import ForwardProxy from '@/network/ForwardProxy';
import NodeConnection from '@/nodes/NodeConnection';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import VaultManager from '@/vaults/VaultManager';
import KeyManager from '@/keys/KeyManager';
import * as keysUtils from '@/keys/utils';
import GRPCServer from '@/grpc/GRPCServer';
import { AgentServiceService } from '@/proto/js/polykey/v1/agent_service_grpc_pb';
import createAgentService from '@/agent/service';
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
import * as testUtils from '../utils';
import * as grpcTestUtils from '../grpc/utils';

const destroyCallback = async () => {};

// Dummy nodeConnectionManager
// We only need the hole punch function and frankly its not used in testing here
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

const mockedGenerateDeterministicKeyPair = jest.spyOn(
  keysUtils,
  'generateDeterministicKeyPair',
);

describe(`${NodeConnection.name} test`, () => {
  const logger = new Logger(`${NodeConnection.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  grpcUtils.setLogger(logger.getChild('grpc'));

  mockedGenerateDeterministicKeyPair.mockImplementation((bits, _) => {
    return keysUtils.generateKeyPair(bits);
  });

  const password = 'password';
  const node: NodeInfo = {
    id: nodesUtils.encodeNodeId(testUtils.generateRandomNodeId()),
    chain: {},
  };

  // Server
  let serverDataDir: string;
  let targetNodeId: NodeId;
  let serverKeyManager: KeyManager;
  let serverVaultManager: VaultManager;
  let serverNodeGraph: NodeGraph;
  let serverNodeConnectionManager: NodeConnectionManager;
  let serverNodeManager: NodeManager;
  let serverSigchain: Sigchain;
  let serverACL: ACL;
  let serverGestaltGraph: GestaltGraph;
  let serverDb: DB;
  let serverNotificationsManager: NotificationsManager;
  let serverRevProxy: ReverseProxy;

  // Client
  let clientDataDir: string;
  let sourceNodeId: NodeId;
  let clientKeyManager: KeyManager;
  const authToken = 'AUTH';
  let clientFwdProxy: ForwardProxy;

  let agentServer: GRPCServer;
  let tlsConfig: TLSConfig;

  const localHost = '127.0.0.1' as Host;
  let targetPort: Port;
  let sourcePort: Port;

  let serverTLSConfig: TLSConfig;

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

    serverKeyManager = await KeyManager.createKeyManager({
      password,
      keysPath: serverKeysPath,
      fs: fs,
      logger: logger,
    });

    serverTLSConfig = {
      keyPrivatePem: serverKeyManager.getRootKeyPairPem().privateKey,
      certChainPem: await serverKeyManager.getRootCertChainPem(),
    };

    serverDb = await DB.createDB({
      dbPath: serverDbPath,
      fs: fs,
      logger: logger,
      crypto: {
        key: serverKeyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    serverACL = await ACL.createACL({
      db: serverDb,
      logger: logger,
    });
    serverSigchain = await Sigchain.createSigchain({
      keyManager: serverKeyManager,
      db: serverDb,
      logger: logger,
    });
    serverGestaltGraph = await GestaltGraph.createGestaltGraph({
      db: serverDb,
      acl: serverACL,
      logger: logger,
    });

    const serverFwdProxy = new ForwardProxy({
      authToken: '',
      logger: logger,
    });

    serverRevProxy = new ReverseProxy({
      logger: logger,
    });

    serverNodeGraph = await NodeGraph.createNodeGraph({
      db: serverDb,
      keyManager: serverKeyManager,
      logger,
    });

    serverNodeConnectionManager = new NodeConnectionManager({
      keyManager: serverKeyManager,
      nodeGraph: serverNodeGraph,
      fwdProxy: serverFwdProxy,
      revProxy: serverRevProxy,
      logger,
    });
    await serverNodeConnectionManager.start();

    serverNodeManager = new NodeManager({
      db: serverDb,
      sigchain: serverSigchain,
      keyManager: serverKeyManager,
      nodeGraph: serverNodeGraph,
      nodeConnectionManager: serverNodeConnectionManager,
      logger: logger,
    });
    serverVaultManager = await VaultManager.createVaultManager({
      keyManager: serverKeyManager,
      vaultsPath: serverVaultsPath,
      nodeConnectionManager: dummyNodeConnectionManager,
      nodeManager: serverNodeManager,
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
        keyManager: serverKeyManager,
        logger: logger,
      });
    await serverGestaltGraph.setNode(node);
    const agentService = createAgentService({
      keyManager: serverKeyManager,
      vaultManager: serverVaultManager,
      nodeConnectionManager: dummyNodeConnectionManager,
      nodeManager: serverNodeManager,
      nodeGraph: serverNodeGraph,
      sigchain: serverSigchain,
      notificationsManager: serverNotificationsManager,
      acl: serverACL,
      gestaltGraph: serverGestaltGraph,
      revProxy: serverRevProxy,
    });
    agentServer = new GRPCServer({
      logger: logger,
    });
    await agentServer.start({
      services: [[AgentServiceService, agentService]],
      host: localHost,
    });
    await serverRevProxy.start({
      serverHost: localHost,
      serverPort: agentServer.getPort(),
      ingressHost: localHost,
      tlsConfig: serverTLSConfig,
    });
    targetPort = serverRevProxy.getIngressPort();
    targetNodeId = serverKeyManager.getNodeId();

    // Client setup
    clientDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-client'),
    );
    const clientKeysPath = path.join(clientDataDir, 'clientKeys');
    clientKeyManager = await KeyManager.createKeyManager({
      password,
      keysPath: clientKeysPath,
      logger,
    });

    const clientTLSConfig = {
      keyPrivatePem: clientKeyManager.getRootKeyPairPem().privateKey,
      certChainPem: await clientKeyManager.getRootCertChainPem(),
    };

    sourceNodeId = clientKeyManager.getNodeId();
    clientFwdProxy = new ForwardProxy({
      authToken: authToken,
      logger: logger,
    });
    await clientFwdProxy.start({
      proxyHost: localHost,
      tlsConfig: clientTLSConfig,
      egressHost: localHost,
    });
    sourcePort = clientFwdProxy.getEgressPort();

    // Other setup
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    const cert = keysUtils.generateCertificate(
      globalKeyPair.publicKey,
      globalKeyPair.privateKey,
      globalKeyPair.privateKey,
      86400,
    );
    tlsConfig = {
      keyPrivatePem: keysUtils.keyPairToPem(globalKeyPair).privateKey,
      certChainPem: keysUtils.certToPem(cert),
    };
  }, global.polykeyStartupTimeout * 2);

  afterEach(async () => {
    await clientFwdProxy.stop();
    await clientKeyManager.stop();
    await clientKeyManager.destroy();
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
    await serverNotificationsManager.stop();
    await serverNotificationsManager.destroy();
    await agentServer.stop();
    await serverRevProxy.stop();
    await serverKeyManager.stop();
    await serverKeyManager.destroy();
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
      fwdProxy: clientFwdProxy,
      keyManager: clientKeyManager,
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
    await serverRevProxy.closeConnection(
      localHost,
      clientFwdProxy.getEgressPort(),
    );
  });
  test('connects to its target (via direct connection)', async () => {
    const conn = await NodeConnection.createNodeConnection({
      targetNodeId: targetNodeId,
      targetHost: localHost,
      targetPort: targetPort,
      fwdProxy: clientFwdProxy,
      keyManager: clientKeyManager,
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
        return serverRevProxy.getConnectionInfoByEgress(localHost, sourcePort);
      },
      (e) => {
        if (e instanceof networkErrors.ErrorConnectionNotComposed) return false;
        if (e instanceof networkErrors.ErrorConnectionNotRunning) return false;
        return true;
      },
    );
    expect(connInfo).toBeDefined();
    expect(connInfo).toMatchObject({
      nodeId: sourceNodeId,
      certificates: expect.any(Array),
      egressHost: localHost,
      egressPort: sourcePort,
      ingressHost: localHost,
      ingressPort: targetPort,
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
      });
      // Have a nodeConnection try to connect to it
      const killSelf = jest.fn();
      nodeConnection = await NodeConnection.createNodeConnection({
        connConnectTime: 500,
        fwdProxy: clientFwdProxy,
        keyManager: clientKeyManager,
        logger: logger,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback: killSelf,
        targetHost: polykeyAgent.revProxy.getIngressHost(),
        targetNodeId: polykeyAgent.keyManager.getNodeId(),
        targetPort: polykeyAgent.revProxy.getIngressPort(),
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
        connConnectTime: 300,
        fwdProxy: clientFwdProxy,
        keyManager: clientKeyManager,
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
        fwdProxy: clientFwdProxy,
        keyManager: clientKeyManager,
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
        fwdProxy: clientFwdProxy,
        keyManager: clientKeyManager,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback,
        logger: logger,
        clientFactory: async (args) =>
          GRPCClientAgent.createGRPCClientAgent(args),
      });

      const expectedPublicKey =
        nodeConnection.getExpectedPublicKey(targetNodeId);
      const publicKeyPem = serverKeyManager.getRootKeyPairPem().publicKey;
      expect(expectedPublicKey).toBe(publicKeyPem);
    } finally {
      await nodeConnection?.destroy();
    }
  });
  test('should call `killSelf if connection is closed based on bad certificate', async () => {
    let revProxy: ReverseProxy | undefined;
    let nodeConnection: NodeConnection<GRPCClientAgent> | undefined;
    let server;
    try {
      server = tcpServer();
      revProxy = new ReverseProxy({
        logger: logger,
      });
      await server.serverListen(0);
      await revProxy.start({
        serverHost: server.serverHost(),
        serverPort: server.serverPort(),
        ingressHost: '127.0.0.1' as Host,
        tlsConfig,
      });
      // Have a nodeConnection try to connect to it
      const killSelf = jest.fn();
      const nodeConnectionP = NodeConnection.createNodeConnection({
        connConnectTime: 500,
        fwdProxy: clientFwdProxy,
        keyManager: clientKeyManager,
        logger: logger,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback: killSelf,
        targetHost: revProxy.getIngressHost(),
        targetNodeId: targetNodeId,
        targetPort: revProxy.getIngressPort(),
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
      await revProxy?.stop();
      await nodeConnection?.destroy();
    }
  });
  test('should call `killSelf if connection is closed before TLS is established', async () => {
    let revProxy: ReverseProxy | undefined;
    let server;
    try {
      server = tcpServer(false, true);
      revProxy = new ReverseProxy({
        logger: logger,
      });
      await server.serverListen(0);
      await revProxy.start({
        serverHost: server.serverHost(),
        serverPort: server.serverPort(),
        ingressHost: '127.0.0.1' as Host,
        tlsConfig,
      });
      // Have a nodeConnection try to connect to it
      const killSelf = jest.fn();
      const nodeConnectionP = NodeConnection.createNodeConnection({
        connConnectTime: 500,
        fwdProxy: clientFwdProxy,
        keyManager: clientKeyManager,
        logger: logger,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback: killSelf,
        targetHost: revProxy.getIngressHost(),
        targetNodeId: targetNodeId,
        targetPort: revProxy.getIngressPort(),
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
      await revProxy?.stop();
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
      });
      // Have a nodeConnection try to connect to it
      const killSelf = jest.fn();
      nodeConnection = await NodeConnection.createNodeConnection({
        connConnectTime: 500,
        fwdProxy: clientFwdProxy,
        keyManager: clientKeyManager,
        logger: logger,
        nodeConnectionManager: dummyNodeConnectionManager,
        destroyCallback: killSelf,
        targetHost: polykeyAgent.revProxy.getIngressHost(),
        targetNodeId: polykeyAgent.keyManager.getNodeId(),
        targetPort: polykeyAgent.revProxy.getIngressPort(),
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
      let testRevProxy: ReverseProxy | undefined;
      let testProcess: child_process.ChildProcessWithoutNullStreams | undefined;
      try {
        const testProcess = child_process.spawn('ts-node', [
          '--require',
          'tsconfig-paths/register',
          'tests/grpc/utils/testServer.ts',
        ]);
        const waitP = promise<string>();
        testProcess.stdout.on('data', (data) => {
          waitP.resolveP(data);
        });
        // TestProcess.stderr.on('data', data => console.log(data.toString()));

        // Lets make a reverse proxy
        testRevProxy = new ReverseProxy({ logger: logger });
        await testRevProxy.start({
          serverHost: '127.0.0.1' as Host,
          serverPort: Number(await waitP.p) as Port,
          ingressHost: '127.0.0.1' as Host,
          tlsConfig: serverTLSConfig,
        });

        // Have a nodeConnection try to connect to it
        const killSelfCheck = jest.fn();
        const killSelfP = promise<null>();
        nodeConnection = await NodeConnection.createNodeConnection({
          connConnectTime: 2000,
          fwdProxy: clientFwdProxy,
          keyManager: clientKeyManager,
          logger: logger,
          nodeConnectionManager: dummyNodeConnectionManager,
          destroyCallback: async () => {
            await killSelfCheck();
            killSelfP.resolveP(null);
          },
          targetNodeId: serverKeyManager.getNodeId(),
          targetHost: testRevProxy.getIngressHost(),
          targetPort: testRevProxy.getIngressPort(),
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
        await testRevProxy?.stop();
        await nodeConnection?.destroy();
      }
    },
  );
  test.each(options)(
    "should call `killSelf and throw if the server %s's during testStreamFail",
    async (option) => {
      let nodeConnection:
        | NodeConnection<grpcTestUtils.GRPCClientTest>
        | undefined;
      let testRevProxy: ReverseProxy | undefined;
      let testProcess: child_process.ChildProcessWithoutNullStreams | undefined;
      try {
        const testProcess = child_process.spawn('ts-node', [
          '--require',
          'tsconfig-paths/register',
          'tests/grpc/utils/testServer.ts',
        ]);
        const waitP = promise<string>();
        testProcess.stdout.on('data', (data) => {
          waitP.resolveP(data);
        });
        // TestProcess.stderr.on('data', data => console.log(data.toString()));

        // Lets make a reverse proxy
        testRevProxy = new ReverseProxy({ logger: logger });
        await testRevProxy.start({
          serverHost: '127.0.0.1' as Host,
          serverPort: Number(await waitP.p) as Port,
          ingressHost: '127.0.0.1' as Host,
          tlsConfig: serverTLSConfig,
        });

        // Have a nodeConnection try to connect to it
        const killSelfCheck = jest.fn();
        const killSelfP = promise<null>();
        nodeConnection = await NodeConnection.createNodeConnection({
          connConnectTime: 2000,
          fwdProxy: clientFwdProxy,
          keyManager: clientKeyManager,
          logger: logger,
          nodeConnectionManager: dummyNodeConnectionManager,
          destroyCallback: async () => {
            await killSelfCheck();
            killSelfP.resolveP(null);
          },
          targetNodeId: serverKeyManager.getNodeId(),
          targetHost: testRevProxy.getIngressHost(),
          targetPort: testRevProxy.getIngressPort(),
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
        await testRevProxy?.stop();
        await nodeConnection?.destroy();
      }
    },
  );
});
