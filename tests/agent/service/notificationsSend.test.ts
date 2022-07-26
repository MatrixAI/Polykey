import type { Host, Port } from '@/network/types';
import type { Notification } from '@/notifications/types';
import type { NodeId } from '@/nodes/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createPrivateKey, createPublicKey } from 'crypto';
import { exportJWK, SignJWT } from 'jose';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import Queue from '@/nodes/Queue';
import KeyManager from '@/keys/KeyManager';
import GRPCServer from '@/grpc/GRPCServer';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import Sigchain from '@/sigchain/Sigchain';
import Proxy from '@/network/Proxy';

import NotificationsManager from '@/notifications/NotificationsManager';
import ACL from '@/acl/ACL';
import GRPCClientAgent from '@/agent/GRPCClientAgent';
import notificationsSend from '@/agent/service/notificationsSend';
import { AgentServiceService } from '@/proto/js/polykey/v1/agent_service_grpc_pb';
import * as notificationsErrors from '@/notifications/errors';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as notificationsPB from '@/proto/js/polykey/v1/notifications/notifications_pb';
import * as nodesUtils from '@/nodes/utils';
import * as notificationsUtils from '@/notifications/utils';
import { expectRemoteError } from '../../utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';

describe('notificationsSend', () => {
  const logger = new Logger('notificationsSend test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authToken = 'abc123';
  let senderId: NodeId;
  let senderKeyManager: KeyManager;
  let dataDir: string;
  let nodeGraph: NodeGraph;
  let queue: Queue;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let proxy: Proxy;

  let db: DB;
  let keyManager: KeyManager;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientAgent;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const senderKeysPath = path.join(dataDir, 'senderKeys');
    senderKeyManager = await KeyManager.createKeyManager({
      password,
      keysPath: senderKeysPath,
      logger,
      privateKeyPemOverride: globalRootKeyPems[0],
    });
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      rootKeyPairBits: 1024,
      logger,
      privateKeyPemOverride: globalRootKeyPems[1],
    });
    senderId = senderKeyManager.getNodeId();
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    acl = await ACL.createACL({
      db,
      logger,
    });
    proxy = new Proxy({
      authToken,
      logger,
    });
    await proxy.start({
      tlsConfig: {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      },
      serverHost: '127.0.0.1' as Host,
      serverPort: 0 as Port,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyManager,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger: logger.getChild('NodeGraph'),
    });
    queue = new Queue({
      logger: logger.getChild('queue'),
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyManager,
      nodeGraph,
      proxy,
      queue,
      connConnectTime: 2000,
      connTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyManager,
      nodeGraph,
      nodeConnectionManager,
      sigchain,
      queue,
      logger,
    });
    await queue.start();
    await nodeManager.start();
    await nodeConnectionManager.start({ nodeManager });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const agentService = {
      notificationsSend: notificationsSend({
        notificationsManager,
        logger,
        db,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[AgentServiceService, agentService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientAgent.createGRPCClientAgent({
      nodeId: keyManager.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  }, global.defaultTimeout);
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await notificationsManager.stop();
    await nodeConnectionManager.stop();
    await queue.stop();
    await nodeManager.stop();
    await sigchain.stop();
    await sigchain.stop();
    await proxy.stop();
    await acl.stop();
    await db.stop();
    await senderKeyManager.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('successfully sends a notification', async () => {
    // Set notify permission for sender on receiver
    await acl.setNodePerm(senderId, {
      gestalt: { notify: null },
      vaults: {},
    });
    // Construct and send notification
    const notification: Notification = {
      data: {
        type: 'General',
        message: 'test',
      },
      senderId: nodesUtils.encodeNodeId(senderId),
      isRead: false,
    };
    const signedNotification = await notificationsUtils.signNotification(
      notification,
      senderKeyManager.getRootKeyPairPem(),
    );
    const request = new notificationsPB.AgentNotification();
    request.setContent(signedNotification);
    const response = await grpcClient.notificationsSend(request);
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    // Check notification was received
    const receivedNotifications =
      await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(1);
    expect(receivedNotifications[0].data).toEqual(notification.data);
    expect(receivedNotifications[0].senderId).toEqual(notification.senderId);
    // Reverse side effects
    await notificationsManager.clearNotifications();
    await acl.unsetNodePerm(senderId);
  });
  test('cannot send invalidly formatted notification', async () => {
    // Set notify permission for sender on receiver
    await acl.setNodePerm(senderId, {
      gestalt: { notify: null },
      vaults: {},
    });
    // Unsigned notification
    const notification1: Notification = {
      data: {
        type: 'General',
        message: 'test',
      },
      senderId: nodesUtils.encodeNodeId(senderId),
      isRead: false,
    };
    const request1 = new notificationsPB.AgentNotification();
    request1.setContent(notification1.toString());
    await expectRemoteError(
      grpcClient.notificationsSend(request1),
      notificationsErrors.ErrorNotificationsParse,
    );
    // Check notification was not received
    let receivedNotifications = await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(0);
    // Improperly typed notification
    const notification2 = {
      data: {
        type: 'invalid',
      },
      senderId,
      isRead: false,
    };
    const publicKey = createPublicKey(
      senderKeyManager.getRootKeyPairPem().publicKey,
    );
    const privateKey = createPrivateKey(
      senderKeyManager.getRootKeyPairPem().privateKey,
    );
    const jwkPublicKey = await exportJWK(publicKey);
    const signedNotification = await new SignJWT(notification2)
      .setProtectedHeader({ alg: 'RS256', jwk: jwkPublicKey })
      .setIssuedAt()
      .sign(privateKey);
    const request2 = new notificationsPB.AgentNotification();
    request2.setContent(signedNotification);
    await expectRemoteError(
      grpcClient.notificationsSend(request2),
      notificationsErrors.ErrorNotificationsValidationFailed,
    );
    // Check notification was not received
    receivedNotifications = await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(0);
    // Reverse side effects
    await acl.unsetNodePerm(senderId);
  });
  test('cannot send notification without permission', async () => {
    // Construct and send notification
    const notification: Notification = {
      data: {
        type: 'General',
        message: 'test',
      },
      senderId: nodesUtils.encodeNodeId(senderId),
      isRead: false,
    };
    const signedNotification = await notificationsUtils.signNotification(
      notification,
      senderKeyManager.getRootKeyPairPem(),
    );
    const request = new notificationsPB.AgentNotification();
    request.setContent(signedNotification);
    await expectRemoteError(
      grpcClient.notificationsSend(request),
      notificationsErrors.ErrorNotificationsPermissionsNotFound,
    );
    // Check notification was not received
    const receivedNotifications =
      await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(0);
  });
});
