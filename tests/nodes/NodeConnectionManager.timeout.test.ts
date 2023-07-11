import type { Host, Port, TLSConfig } from '@/network/types';
import type { Host as QUICHost } from '@matrixai/quic/dist/types';
import type { NodeId } from '@/ids';
import type { NodeAddress } from '@/nodes/types';
import type { NodeIdString } from '@/ids';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICSocket } from '@matrixai/quic';
import { DB } from '@matrixai/db';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeConnection from '@/nodes/NodeConnection';
import * as keysUtils from '@/keys/utils';
import KeyRing from '@/keys/KeyRing';
import ACL from '@/acl/ACL';
import GestaltGraph from '@/gestalts/GestaltGraph';
import NodeGraph from '@/nodes/NodeGraph';
import Sigchain from '@/sigchain/Sigchain';
import TaskManager from '@/tasks/TaskManager';
import NodeManager from '@/nodes/NodeManager';
import PolykeyAgent from '@/PolykeyAgent';
import { sleep } from '@/utils';
import * as tlsTestUtils from '../utils/tls';
import {generateRandomNodeId} from "./utils";
import {Timer} from "@matrixai/timer";

describe(`${NodeConnectionManager.name} general test`, () => {
  const logger = new Logger(`${NodeConnection.name} test`, LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const localHost = '127.0.0.1' as Host;
  const password = 'password';
  const crypto = tlsTestUtils.createCrypto();

  let dataDir: string;

  let remotePolykeyAgent1: PolykeyAgent;
  let remoteAddress1: NodeAddress;
  let remoteNodeId1: NodeId;
  let clientSocket: QUICSocket;

  let keyRing: KeyRing;
  let db: DB;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let taskManager: TaskManager;
  let nodeManager: NodeManager;
  let tlsConfig: TLSConfig;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    // Setting up remote node
    const nodePathA = path.join(dataDir, 'agentA');
    remotePolykeyAgent1 = await PolykeyAgent.createPolykeyAgent({
      nodePath: nodePathA,
      password,
      networkConfig: {
        agentHost: localHost,
      },
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
      },
      logger: logger.getChild('AgentA'),
    });
    remoteNodeId1 = remotePolykeyAgent1.keyRing.getNodeId();
    remoteAddress1 = {
      host: remotePolykeyAgent1.quicSocket.host as unknown as Host,
      port: remotePolykeyAgent1.quicSocket.port as unknown as Port,
    };

    clientSocket = new QUICSocket({
      logger: logger.getChild('clientSocket'),
    });
    await clientSocket.start({
      host: localHost as unknown as QUICHost,
    });

    // Setting up client dependencies
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
    });
    tlsConfig = await tlsTestUtils.createTLSConfig(keyRing.keyPair);
  });

  afterEach(async () => {
    await taskManager.stopTasks();
    await sigchain.stop();
    await sigchain.destroy();
    await nodeGraph.stop();
    await nodeGraph.destroy();
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
    await acl.stop();
    await acl.destroy();
    await db.stop();
    await db.destroy();
    await keyRing.stop();
    await keyRing.destroy();
    await clientSocket.stop({ force: true });
    await taskManager.stop();

    await remotePolykeyAgent1.stop();
  });

  test('starting should add seed nodes to the node graph', async () => {
    const nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      quicClientConfig: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      seedNodes: undefined,
      connTimeoutTime: 500,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      nodeManager,
    });
    await taskManager.startProcessing();

    await nodeGraph.setNode(remoteNodeId1, remoteAddress1);

    // @ts-ignore: kidnap connections
    const connections = nodeConnectionManager.connections;
    // @ts-ignore: kidnap connections
    const connectionLocks = nodeConnectionManager.connectionLocks;
    await nodeConnectionManager.withConnF(remoteNodeId1, async () => {});
    const connAndLock = connections.get(
      remoteNodeId1.toString() as NodeIdString,
    );
    // Check entry is in map and lock is released
    expect(connAndLock).toBeDefined();
    expect(connectionLocks.isLocked(remoteNodeId1.toString())).toBeFalsy();
    expect(connAndLock?.timer).toBeDefined();
    expect(connAndLock?.connection).toBeDefined();

    // Wait for timeout
    await sleep(1000);

    const finalConnAndLock = connections.get(
      remoteNodeId1.toString() as NodeIdString,
    );
    expect(finalConnAndLock).toBeUndefined();
    expect(connectionLocks.isLocked(remoteNodeId1.toString())).toBeFalsy();

    await nodeConnectionManager.stop();
  });
  test('withConnection should extend timeout', async () => {
    const nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      quicClientConfig: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      seedNodes: undefined,
      connTimeoutTime: 1000,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      nodeManager,
    });
    await taskManager.startProcessing();

    await nodeGraph.setNode(remoteNodeId1, remoteAddress1);

    // @ts-ignore: kidnap connections
    const connections = nodeConnectionManager.connections;
    // @ts-ignore: kidnap connections
    const connectionLocks = nodeConnectionManager.connectionLocks;
    await nodeConnectionManager.withConnF(remoteNodeId1, async () => {});
    const connAndLock = connections.get(
      remoteNodeId1.toString() as NodeIdString,
    );
    // Check entry is in map and lock is released
    expect(connAndLock).toBeDefined();
    expect(connectionLocks.isLocked(remoteNodeId1.toString())).toBeFalsy();
    expect(connAndLock?.timer).toBeDefined();
    expect(connAndLock?.connection).toBeDefined();

    // WithConnection should extend timeout to 1500ms
    await sleep(500);
    await nodeConnectionManager.withConnF(remoteNodeId1, async () => {
      // Do noting
    });

    // Connection should still exist after 1250 secs
    await sleep(750);
    const midConnAndLock = connections.get(
      remoteNodeId1.toString() as NodeIdString,
    );
    expect(midConnAndLock).toBeDefined();
    expect(connectionLocks.isLocked(remoteNodeId1.toString())).toBeFalsy();
    expect(midConnAndLock?.timer).toBeDefined();
    expect(midConnAndLock?.connection).toBeDefined();

    // Should be dead after 1750 secs
    await sleep(500);
    const finalConnAndLock = connections.get(
      remoteNodeId1.toString() as NodeIdString,
    );
    expect(finalConnAndLock).not.toBeDefined();
    expect(connectionLocks.isLocked(remoteNodeId1.toString())).toBeFalsy();

    await nodeConnectionManager.stop();
  });
  test('withConnection should extend timeout', async () => {
    const nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      quicClientConfig: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      seedNodes: undefined,
      connTimeoutTime: 1000,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      nodeManager,
    });
    await taskManager.startProcessing();

    await nodeGraph.setNode(remoteNodeId1, remoteAddress1);

    // @ts-ignore: kidnap connections
    const connections = nodeConnectionManager.connections;
    // @ts-ignore: kidnap connections
    const connectionLocks = nodeConnectionManager.connectionLocks;
    await nodeConnectionManager.withConnF(remoteNodeId1, async () => {});
    const midConnAndLock = connections.get(
      remoteNodeId1.toString() as NodeIdString,
    );
    // Check entry is in map and lock is released
    expect(midConnAndLock).toBeDefined();
    expect(connectionLocks.isLocked(remoteNodeId1.toString())).toBeFalsy();
    expect(midConnAndLock?.timer).toBeDefined();

    // Destroying the connection
    // @ts-ignore: private method
    await nodeConnectionManager.destroyConnection(remoteNodeId1);
    const finalConnAndLock = connections.get(
      remoteNodeId1.toString() as NodeIdString,
    );
    expect(finalConnAndLock).not.toBeDefined();
    expect(connectionLocks.isLocked(remoteNodeId1.toString())).toBeFalsy();

    await nodeConnectionManager.stop();
  });
  test('Connection can time out', async () => {
    const nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      quicClientConfig: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      seedNodes: undefined,
      connTimeoutTime: 5000,
      connConnectTime: 200,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      nodeManager,
    });
    await taskManager.startProcessing();

    const randomNodeId = generateRandomNodeId();
    await nodeManager.setNode(randomNodeId, {
      host : '127.0.0.1' as Host,
      port: 12321 as Port,
    });
    await expect(nodeConnectionManager.withConnF(randomNodeId, async () => {
      // do nothing
    })).rejects.toThrow();
  })
  test('Connection can time out with passed in timer', async () => {
    const nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      quicClientConfig: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      seedNodes: undefined,
      connTimeoutTime: 5000,
      connConnectTime: 200,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      nodeManager,
    });
    await taskManager.startProcessing();

    const randomNodeId = generateRandomNodeId();
    await nodeManager.setNode(randomNodeId, {
      host : '127.0.0.1' as Host,
      port: 12321 as Port,
    });
    await expect(nodeConnectionManager.withConnF(
      randomNodeId,
      async () => {
      // do nothing
    },
      {timer: new Timer({
          delay: 100,
        })} )).rejects.toThrow();
  })
  test('Connection can time out with passed in timer and signal', async () => {
    const nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      quicClientConfig: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      seedNodes: undefined,
      connTimeoutTime: 5000,
      connConnectTime: 200,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      nodeManager,
    });
    await taskManager.startProcessing();

    const randomNodeId = generateRandomNodeId();
    await nodeManager.setNode(randomNodeId, {
      host : '127.0.0.1' as Host,
      port: 12321 as Port,
    });
    const abortController = new AbortController();
    const ctx = {
      timer: new Timer({
        delay: 100,
      }),
      signal: abortController.signal,
    }
    // We need to hook up signal manually
    ctx.timer.finally(() => {
      abortController.abort(Error('Some Error'));
    })
    await expect(nodeConnectionManager.withConnF(
      randomNodeId,
      async () => {
      // do nothing
    },
      ctx )).rejects.toThrow();
  })
});
