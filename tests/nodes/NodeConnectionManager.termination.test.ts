import type { AddressInfo } from 'net';
import type { NodeId, NodeIdString, SeedNodes } from '@/nodes/types';
import type { Host, Port, TLSConfig } from '@/network/types';
import type NodeManager from '@/nodes/NodeManager';
import type SetNodeQueue from '@/nodes/SetNodeQueue';
import net from 'net';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DB } from '@matrixai/db';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { destroyed } from '@matrixai/async-init/';
import { IdInternal } from '@matrixai/id';
import PolykeyAgent from '@/PolykeyAgent';
import KeyManager from '@/keys/KeyManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import Proxy from '@/network/Proxy';

import * as nodesUtils from '@/nodes/utils';
import * as nodesErrors from '@/nodes/errors';
import * as keysUtils from '@/keys/utils';
import * as grpcErrors from '@/grpc/errors';
import * as grpcUtils from '@/grpc/utils';
import * as agentErrors from '@/agent/errors';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { promise, promisify } from '@/utils';
import * as testUtils from '../utils';

describe(`${NodeConnectionManager.name} termination test`, () => {
  const logger = new Logger(
    `${NodeConnectionManager.name} test`,
    LogLevel.WARN,
    [new StreamHandler()],
  );
  grpcUtils.setLogger(logger.getChild('grpc'));

  // Constants
  const password = 'password';
  const nodeId1 = IdInternal.create<NodeId>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 5,
  ]);
  const nodeId2 = IdInternal.create<NodeId>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 8,
  ]);
  const nodeId3 = IdInternal.create<NodeId>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 124,
  ]);
  const dummyNodeId = nodesUtils.decodeNodeId(
    'vi3et1hrpv2m2lrplcm7cu913kr45v51cak54vm68anlbvuf83ra0',
  )!;

  const localHost = '127.0.0.1' as Host;
  const serverHost = '127.0.0.1' as Host;
  const serverPort = 55555 as Port;

  const dummySeedNodes: SeedNodes = {};
  dummySeedNodes[nodesUtils.encodeNodeId(nodeId1)] = {
    host: serverHost,
    port: serverPort,
  };
  dummySeedNodes[nodesUtils.encodeNodeId(nodeId2)] = {
    host: serverHost,
    port: serverPort,
  };
  dummySeedNodes[nodesUtils.encodeNodeId(nodeId3)] = {
    host: serverHost,
    port: serverPort,
  };

  const nop = async () => {};

  //
  let dataDir: string;
  let nodePath: string;
  let keyManager: KeyManager;
  let db: DB;
  let defaultProxy: Proxy;
  let nodeGraph: NodeGraph;

  let tlsConfig2: TLSConfig;

  const mockedGenerateDeterministicKeyPair = jest.spyOn(
    keysUtils,
    'generateDeterministicKeyPair',
  );
  const dummyNodeManager = { setNode: jest.fn() } as unknown as NodeManager;

  beforeEach(async () => {
    mockedGenerateDeterministicKeyPair.mockImplementation((bits, _) => {
      return keysUtils.generateKeyPair(bits);
    });

    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'node');
    const keysPath = path.join(dataDir, 'keys');
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger: logger.getChild('keyManager'),
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger: logger,
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger: logger.getChild('NodeGraph'),
    });
    const tlsConfig = {
      keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
      certChainPem: keysUtils.certToPem(keyManager.getRootCert()),
    };
    defaultProxy = new Proxy({
      authToken: 'auth',
      logger: logger.getChild('proxy'),
    });
    await defaultProxy.start({
      serverHost,
      serverPort,
      proxyHost: localHost,
      tlsConfig,
    });
    // Other setup
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    const cert = keysUtils.generateCertificate(
      globalKeyPair.publicKey,
      globalKeyPair.privateKey,
      globalKeyPair.privateKey,
      86400,
    );
    tlsConfig2 = {
      keyPrivatePem: keysUtils.keyPairToPem(globalKeyPair).privateKey,
      certChainPem: keysUtils.certToPem(cert),
    };
  });

  afterEach(async () => {
    await nodeGraph.stop();
    await nodeGraph.destroy();
    await db.stop();
    await db.destroy();
    await keyManager.stop();
    await keyManager.destroy();
    await defaultProxy.stop();
  });

  /**
   * Mock TCP server
   * This is the server that the Proxy will be proxying to
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
          conn.end(() => {
            conn.destroy();
          });
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

  test('closed based on bad certificate during createConnection ', async () => {
    let server;
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let proxy: Proxy | undefined;
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
        tlsConfig: tlsConfig2,
      });
      await nodeGraph.setNode(dummyNodeId, {
        host: proxy.getProxyHost(),
        port: proxy.getProxyPort(),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        setNodeQueue: {} as SetNodeQueue,
        logger: logger,
        connConnectTime: 2000,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      // Attempt a connection
      await expect(
        nodeConnectionManager.withConnF(dummyNodeId, nop),
      ).rejects.toThrow(nodesErrors.ErrorNodeConnectionTimeout);
    } finally {
      await nodeConnectionManager?.stop();
      await proxy?.stop();
      await server?.serverClose();
    }
  });
  test('closed based on bad certificate during withConnection', async () => {
    let server;
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let proxy: Proxy | undefined;
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
        tlsConfig: tlsConfig2,
      });
      await nodeGraph.setNode(dummyNodeId, {
        host: proxy.getProxyHost(),
        port: proxy.getProxyPort(),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        setNodeQueue: {} as SetNodeQueue,
        logger: logger,
        connConnectTime: 2000,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      // Attempt a connection
      const resultP = nodeConnectionManager.withConnF(dummyNodeId, async () => {
        // Do nothing
      });
      await expect(resultP).rejects.toThrow(
        nodesErrors.ErrorNodeConnectionTimeout,
      );
    } finally {
      await nodeConnectionManager?.stop();
      await proxy?.stop();
      await server?.serverClose();
    }
  });
  test('closed before TLS is established', async () => {
    let server;
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let proxy: Proxy | undefined;
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
        tlsConfig: tlsConfig2,
      });
      await nodeGraph.setNode(dummyNodeId, {
        host: proxy.getProxyHost(),
        port: proxy.getProxyPort(),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        setNodeQueue: {} as SetNodeQueue,
        logger: logger,
        connConnectTime: 2000,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      // Attempt a connection
      const connectionAttemptP = nodeConnectionManager.withConnF(
        dummyNodeId,
        async () => {
          // Do nothing
        },
      );
      await expect(connectionAttemptP).rejects.toThrow(
        nodesErrors.ErrorNodeConnectionTimeout,
      );
    } finally {
      await nodeConnectionManager?.stop();
      await proxy?.stop();
      await server?.serverClose();
    }
  });
  test('the connection is stopped by the server', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let polykeyAgent: PolykeyAgent | undefined;
    try {
      polykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: nodePath,
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        logger: logger,
      });

      const agentNodeId = polykeyAgent.keyManager.getNodeId();
      await nodeGraph.setNode(agentNodeId, {
        host: polykeyAgent.proxy.getProxyHost(),
        port: polykeyAgent.proxy.getProxyPort(),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy: defaultProxy,
        setNodeQueue: {} as SetNodeQueue,
        logger: logger,
        connConnectTime: 2000,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      // @ts-ignore: kidnapping connection map
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnapping connection map
      const connectionLocks = nodeConnectionManager.connectionLocks;

      // Connections should be empty
      expect(connections.size).toBe(0);
      await nodeConnectionManager.withConnF(agentNodeId, nop);
      // Should have 1 connection now
      expect(connections.size).toBe(1);
      const firstConnAndLock = connections.get(
        agentNodeId.toString() as NodeIdString,
      );
      const firstConnection = firstConnAndLock?.connection;

      // Resolves if the shutdownCallback was called
      await polykeyAgent.stop();
      // Connection should be removed
      expect(connections.size).toBe(1);
      expect(
        connectionLocks.isLocked(agentNodeId.toString() as NodeIdString),
      ).toBe(false);
      if (firstConnection != null) {
        expect(firstConnection[destroyed]).toBe(true);
      }
    } finally {
      await nodeConnectionManager?.stop();
      await polykeyAgent?.stop();
    }
  });
  test('the connection is broken during withConnection', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let polykeyAgent: PolykeyAgent | undefined;
    try {
      polykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: nodePath,
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        logger: logger,
      });
      const agentNodeId = polykeyAgent.keyManager.getNodeId();
      await nodeGraph.setNode(agentNodeId, {
        host: polykeyAgent.proxy.getProxyHost(),
        port: polykeyAgent.proxy.getProxyPort(),
      });

      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy: defaultProxy,
        setNodeQueue: {} as SetNodeQueue,
        logger: logger,
        connConnectTime: 2000,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      // @ts-ignore: kidnapping connection map
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnapping connection map
      const connectionLocks = nodeConnectionManager.connectionLocks;

      // Connections should be empty
      expect(connections.size).toBe(0);
      await nodeConnectionManager.withConnF(agentNodeId, nop);
      // Should have 1 connection now
      expect(connections.size).toBe(1);
      const firstConnAndLock = connections.get(
        agentNodeId.toString() as NodeIdString,
      );
      const firstConnection = firstConnAndLock?.connection;

      // Resolves if the shutdownCallback was called
      const withConnectionP = nodeConnectionManager.withConnF(
        agentNodeId,
        async (connection) => {
          const client = connection.getClient();
          expect(connection[destroyed]).toBe(false);
          expect(client[destroyed]).toBe(false);
          await polykeyAgent?.stop();
          expect(client[destroyed]).toBe(true);
          expect(connection[destroyed]).toBe(true);
          // Breaking call
          const attemptP = client.echo(new utilsPB.EchoMessage());
          await expect(attemptP).rejects.toThrow();
          await attemptP;
        },
      );

      await expect(withConnectionP).rejects.toThrow();

      // Connection should be removed
      expect(connections.size).toBe(0);
      expect(
        connectionLocks.isLocked(agentNodeId.toString() as NodeIdString),
      ).toBe(false);
      if (firstConnection != null) {
        expect(firstConnection[destroyed]).toBe(true);
      }
    } finally {
      await nodeConnectionManager?.stop();
      await polykeyAgent?.stop();
    }
  });
  const errorOptions = [
    'ErrorNodeConnectionDestroyed',
    'ErrorGRPCClientTimeout',
    'ErrorAgentClientDestroyed',
  ];
  test.each(errorOptions)('withConnF receives a %s error', async (option) => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let polykeyAgent: PolykeyAgent | undefined;
    try {
      polykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: nodePath,
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        logger: logger,
      });

      const agentNodeId = polykeyAgent.keyManager.getNodeId();
      await nodeGraph.setNode(agentNodeId, {
        host: polykeyAgent.proxy.getProxyHost(),
        port: polykeyAgent.proxy.getProxyPort(),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy: defaultProxy,
        setNodeQueue: {} as SetNodeQueue,
        logger: logger,
        connConnectTime: 2000,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      // @ts-ignore: kidnapping connection map
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnapping connection map
      const connectionLocks = nodeConnectionManager.connectionLocks;

      // Connections should be empty
      expect(connections.size).toBe(0);
      await nodeConnectionManager.withConnF(agentNodeId, nop);
      // Should have 1 connection now
      expect(connections.size).toBe(1);
      const firstConnAndLock = connections.get(
        agentNodeId.toString() as NodeIdString,
      );
      const firstConnection = firstConnAndLock?.connection;

      // Resolves if the shutdownCallback was called
      const responseP = nodeConnectionManager.withConnF(
        agentNodeId,
        async () => {
          // Throw an error here
          switch (option) {
            case 'ErrorNodeConnectionDestroyed':
              throw new nodesErrors.ErrorNodeConnectionDestroyed();
            case 'ErrorGRPCClientTimeout':
              throw new grpcErrors.ErrorGRPCClientTimeout();
            case 'ErrorAgentClientDestroyed':
              throw new agentErrors.ErrorAgentClientDestroyed();
          }
        },
      );
      await expect(responseP).rejects.toThrow();

      // Connection should be removed
      expect(connections.size).toBe(0);
      expect(
        connectionLocks.isLocked(agentNodeId.toString() as NodeIdString),
      ).toBe(false);
      if (firstConnection != null) {
        expect(firstConnection[destroyed]).toBe(true);
      }
    } finally {
      await nodeConnectionManager?.stop();
      await polykeyAgent?.stop();
    }
  });
  test.each(errorOptions)('withConnG receives a %s error', async (option) => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let polykeyAgent: PolykeyAgent | undefined;
    try {
      polykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: nodePath,
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        logger: logger,
      });

      const agentNodeId = polykeyAgent.keyManager.getNodeId();
      await nodeGraph.setNode(agentNodeId, {
        host: polykeyAgent.proxy.getProxyHost(),
        port: polykeyAgent.proxy.getProxyPort(),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy: defaultProxy,
        setNodeQueue: {} as SetNodeQueue,
        logger: logger,
        connConnectTime: 2000,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      // @ts-ignore: kidnapping connection map
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnapping connection map
      const connectionLocks = nodeConnectionManager.connectionLocks;

      // Connections should be empty
      expect(connections.size).toBe(0);
      await nodeConnectionManager.withConnF(agentNodeId, nop);
      // Should have 1 connection now
      expect(connections.size).toBe(1);
      const firstConnAndLock = connections.get(
        agentNodeId.toString() as NodeIdString,
      );
      const firstConnection = firstConnAndLock?.connection;

      // Resolves if the shutdownCallback was called
      const gen = await nodeConnectionManager.withConnG(
        agentNodeId,
        async function* (): AsyncGenerator<string, void, void> {
          // Throw an error here
          switch (option) {
            case 'ErrorNodeConnectionDestroyed':
              throw new nodesErrors.ErrorNodeConnectionDestroyed();
            case 'ErrorGRPCClientTimeout':
              throw new grpcErrors.ErrorGRPCClientTimeout();
            case 'ErrorAgentClientDestroyed':
              throw new agentErrors.ErrorAgentClientDestroyed();
          }
          yield 'hello world';
        },
      );
      await expect(async () => {
        for await (const _ of gen) {
          // Do nothing
        }
      }).rejects.toThrow();

      // Connection should be removed
      expect(connections.size).toBe(0);
      expect(
        connectionLocks.isLocked(agentNodeId.toString() as NodeIdString),
      ).toBe(false);
      if (firstConnection != null) {
        expect(firstConnection[destroyed]).toBe(true);
      }
    } finally {
      await nodeConnectionManager?.stop();
      await polykeyAgent?.stop();
    }
  });
  test('client itself is killed during withConnection', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let polykeyAgent: PolykeyAgent | undefined;
    try {
      polykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: nodePath,
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        logger: logger,
      });

      const agentNodeId = polykeyAgent.keyManager.getNodeId();
      await nodeGraph.setNode(agentNodeId, {
        host: polykeyAgent.proxy.getProxyHost(),
        port: polykeyAgent.proxy.getProxyPort(),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy: defaultProxy,
        setNodeQueue: {} as SetNodeQueue,
        logger: logger,
        connConnectTime: 2000,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      // @ts-ignore: kidnapping connection map
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnapping connection map
      const connectionLocks = nodeConnectionManager.connectionLocks;

      // Connections should be empty
      expect(connections.size).toBe(0);
      await nodeConnectionManager.withConnF(agentNodeId, nop);
      // Should have 1 connection now
      expect(connections.size).toBe(1);
      const firstConnAndLock = connections.get(
        agentNodeId.toString() as NodeIdString,
      );
      const firstConnection = firstConnAndLock?.connection;

      const killSelfP = promise<null>();
      // Resolves if the shutdownCallback was called
      await nodeConnectionManager.withConnF(agentNodeId, async (connection) => {
        const client = connection.getClient();
        expect(connection[destroyed]).toBe(false);
        expect(client[destroyed]).toBe(false);

        // We want to watch for the killSelf event by hijacking the NodeConnectionmanagerInterface
        const oldKillSelf =
          // @ts-ignore: kidnap the callback
          connection.destroyCallback;
        // @ts-ignore: update the callback;
        connection.destroyCallback = async () => {
          await oldKillSelf();
          killSelfP.resolveP(null);
        };
        await connection.destroy();
      });

      // Wait for `killSelf` to resolve
      await killSelfP.p;

      // Connection should be removed
      expect(connections.size).toBe(1);
      expect(
        connectionLocks.isLocked(agentNodeId.toString() as NodeIdString),
      ).toBe(false);
      if (firstConnection != null) {
        expect(firstConnection[destroyed]).toBe(true);
      }
    } finally {
      await nodeConnectionManager?.stop();
      await polykeyAgent?.stop();
    }
  });
  test('client itself is killed', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let polykeyAgent: PolykeyAgent | undefined;
    try {
      polykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: nodePath,
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        logger: logger,
      });

      const agentNodeId = polykeyAgent.keyManager.getNodeId();
      await nodeGraph.setNode(agentNodeId, {
        host: polykeyAgent.proxy.getProxyHost(),
        port: polykeyAgent.proxy.getProxyPort(),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy: defaultProxy,
        setNodeQueue: {} as SetNodeQueue,
        logger: logger,
        connConnectTime: 2000,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      // @ts-ignore: kidnapping connection map
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnapping connection map
      const connectionLocks = nodeConnectionManager.connectionLocks;

      // Connections should be empty
      expect(connections.size).toBe(0);
      await nodeConnectionManager.withConnF(agentNodeId, nop);
      // Should have 1 connection now
      expect(connections.size).toBe(1);
      const firstConnAndLock = connections.get(
        agentNodeId.toString() as NodeIdString,
      );
      const firstConnection = firstConnAndLock?.connection;

      // We want to watch for the killSelf event by hijacking the NodeConnectionmanagerInterface
      const oldKillSelf =
        // @ts-ignore: kidnap the callback
        firstConnection?.destroyCallback;
      const killSelfP = promise<null>();
      if (firstConnection != null) {
        // @ts-ignore: update the callback;
        firstConnection.destroyCallback = async () => {
          if (oldKillSelf != null) await oldKillSelf();
          killSelfP.resolveP(null);
        };
      }
      await firstConnection?.destroy();
      // Wait for `killSelf` to resolve
      await killSelfP.p;

      // Connection should be removed
      expect(connections.size).toBe(1);
      expect(
        connectionLocks.isLocked(agentNodeId.toString() as NodeIdString),
      ).toBe(false);
      if (firstConnection != null) {
        expect(firstConnection[destroyed]).toBe(true);
      }
    } finally {
      await nodeConnectionManager?.stop();
      await polykeyAgent?.stop();
    }
  });
});
