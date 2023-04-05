import type { TLSConfig } from '@/network/types';
import type { GestaltNodeInfo } from '@/gestalts/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import TaskManager from '@/tasks/TaskManager';
import { GestaltsActionsGetByNodeHandler } from '@/client/handlers/gestaltsActionsGetByNode';
import { GestaltsActionsSetByNodeHandler } from '@/client/handlers/gestaltsActionsSetByNode';
import { GestaltsActionsUnsetByNodeHandler } from '@/client/handlers/gestaltsActionsUnsetByNode';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import * as nodesUtils from '@/nodes/utils';
import {
  gestaltsActionsGetByNode,
  gestaltsActionsSetByNode,
  gestaltsActionsUnsetByNode,
} from '@/client';
import * as testsUtils from '../../utils';

describe('gestaltsActionsByNode', () => {
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
  test('sets/unsets/gets actions by node', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        gestaltsActionsGetByNode: new GestaltsActionsGetByNodeHandler({
          db,
          gestaltGraph,
        }),
        gestaltsActionsSetByNode: new GestaltsActionsSetByNodeHandler({
          db,
          gestaltGraph,
        }),
        gestaltsActionsUnsetByNode: new GestaltsActionsUnsetByNodeHandler({
          db,
          gestaltGraph,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair) => rpcServer.handleStream(streamPair),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.getPort(),
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsActionsGetByNode,
        gestaltsActionsSetByNode,
        gestaltsActionsUnsetByNode,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const nodeId = keyRing.getNodeId();
    const node: GestaltNodeInfo = {
      nodeId: nodeId,
    };
    await gestaltGraph.setNode(node);
    // Set permission
    const nodeMessage = {
      nodeIdEncoded: nodesUtils.encodeNodeId(nodeId),
    };
    const action = 'notify' as const;
    const requestMessage = {
      ...nodeMessage,
      action,
    };
    await rpcClient.methods.gestaltsActionsSetByNode(requestMessage);
    // Check for permission
    const getSetResponse = await rpcClient.methods.gestaltsActionsGetByNode(
      nodeMessage,
    );
    expect(getSetResponse.actionsList).toContainEqual(action);
    // Unset permission
    await rpcClient.methods.gestaltsActionsUnsetByNode(requestMessage);
    // Check permission was removed
    const getUnsetResponse = await rpcClient.methods.gestaltsActionsGetByNode(
      nodeMessage,
    );
    expect(getUnsetResponse.actionsList).toHaveLength(0);
  });
});
