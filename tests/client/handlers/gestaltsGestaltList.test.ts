import type { TLSConfig } from '@/network/types';
import type { IdentityId, ProviderId } from '@/ids/index';
import type { GestaltIdentityInfo, GestaltNodeInfo } from '@/gestalts/types';
import type { Gestalt } from '@/gestalts/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import TaskManager from '@/tasks/TaskManager';
import { GestaltsGestaltListHandler } from '@/client/handlers/gestaltsGestaltList';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import * as gestaltUtils from '@/gestalts/utils';
import { gestaltsGestaltList } from '@/client';
import * as testsUtils from '../../utils';

describe('gestaltsGestaltList', () => {
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
  let taskManager: TaskManager;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
  let tlsConfig: TLSConfig;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;

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
    taskManager = await TaskManager.createTaskManager({ db, logger });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
  });
  afterEach(async () => {
    await webSocketServer.stop(true);
    await webSocketClient.destroy(true);
    await acl.stop();
    await gestaltGraph.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('lists gestalts', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        gestaltsGestaltList: new GestaltsGestaltListHandler({
          db,
          gestaltGraph,
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
        gestaltsGestaltList,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const nodeId = keyRing.getNodeId();
    const node: GestaltNodeInfo = {
      nodeId: nodeId,
    };
    const identity: GestaltIdentityInfo = {
      identityId: 'identityId' as IdentityId,
      providerId: 'providerId' as ProviderId,
    };
    await gestaltGraph.setNode(node);
    await gestaltGraph.setIdentity(identity);
    const nodeKey = gestaltUtils.encodeGestaltId(['node', nodeId]);
    const identityKey = gestaltUtils.encodeGestaltId([
      'identity',
      [identity.providerId, identity.identityId],
    ]);
    const expectedNodeGestalt: Gestalt = {
      matrix: {},
      nodes: {},
      identities: {},
    };
    expectedNodeGestalt.matrix[nodeKey] = {};
    expectedNodeGestalt.nodes[nodeKey] = expect.any(Object);
    const expectedIdentityGestalt: Gestalt = {
      matrix: {},
      nodes: {},
      identities: {},
    };
    expectedIdentityGestalt.matrix[identityKey] = {};
    expectedIdentityGestalt.identities[identityKey] = expect.any(Object);

    for await (const response of await rpcClient.methods.gestaltsGestaltList(
      {},
    )) {
      if (Object.keys(response.gestalt.identities).length !== 0) {
        // Should be the identity response
        expect(response.gestalt).toEqual(expectedIdentityGestalt);
      } else {
        // Otherwise the node gestalt
        expect(response.gestalt).toEqual(expectedNodeGestalt);
      }
    }
  });
});
