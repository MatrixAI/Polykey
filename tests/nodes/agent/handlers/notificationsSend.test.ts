import type { Notification, SignedNotification } from '@/notifications/types';
import type { NodeId } from '@/ids';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { Host } from '@/network/types';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer, events as quicEvents } from '@matrixai/quic';
import { DB } from '@matrixai/db';
import { RPCClient, RPCServer } from '@matrixai/rpc';
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';
import KeyRing from '@/keys/KeyRing';
import * as nodesUtils from '@/nodes/utils';
import NodeGraph from '@/nodes/NodeGraph';
import * as notificationsUtils from '@/notifications/utils';
import { notificationsSend } from '@/nodes/agent/callers';
import NotificationsSend from '@/nodes/agent/handlers/NotificationsSend';
import NotificationsManager from '@/notifications/NotificationsManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeManager from '@/nodes/NodeManager';
import ACL from '@/acl/ACL';
import { Token } from '@/tokens';
import * as notificationsErrors from '@/notifications/errors';
import * as validationErrors from '@/validation/errors';
import * as keysUtils from '@/keys/utils';
import * as networkUtils from '@/network/utils';
import Sigchain from '@/sigchain/Sigchain';
import TaskManager from '@/tasks/TaskManager';
import * as testUtils from '../../../utils/utils';
import * as tlsTestsUtils from '../../../utils/tls';
import 'ix/add/asynciterable-operators/toarray';

describe('notificationsSend', () => {
  const logger = new Logger('notificationsSend test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const localHost = '127.0.0.1' as Host;

  let dataDir: string;

  let keyRing: KeyRing;
  let db: DB;
  let nodeGraph: NodeGraph;
  let acl: ACL;
  let sigchain: Sigchain;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let rpcServer: RPCServer;
  let quicServer: QUICServer;

  let senderKeyRing: KeyRing;
  let senderNodeId: NodeId;

  const clientManifest = {
    notificationsSend,
  };
  type ClientManifest = typeof clientManifest;
  let rpcClient: RPCClient<ClientManifest>;
  let quicClient: QUICClient;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    const senderKeysPath = path.join(dataDir, 'senderKeys');
    senderKeyRing = await KeyRing.createKeyRing({
      keysPath: senderKeysPath,
      password,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    senderNodeId = senderKeyRing.getNodeId();

    // Handler dependencies
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    acl = await ACL.createACL({
      db,
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    const tlsConfigClient = await tlsTestsUtils.createTLSConfig(
      keyRing.keyPair,
    );
    nodeConnectionManager = new NodeConnectionManager({
      tlsConfig: tlsConfigClient,
      keyRing,
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTimeMin: 2000,
      connectionIdleTimeoutTimeScale: 0,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeGraph,
      nodeConnectionManager,
      sigchain,
      taskManager,
      gestaltGraph: {} as GestaltGraph,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localHost,
      agentService: {} as AgentServerManifest,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        db,
        keyRing,
        acl,
        taskManager,
        nodeManager,
        logger,
      });
    await taskManager.startProcessing();
    // Setting up server
    const serverManifest = {
      notificationsSend: new NotificationsSend({
        db,
        keyRing,
        notificationsManager,
      }),
    };
    rpcServer = new RPCServer({
      fromError: networkUtils.fromError,
      logger,
    });
    await rpcServer.start({ manifest: serverManifest });
    const tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
    quicServer = new QUICServer({
      config: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        verifyPeer: true,
        verifyCallback: async () => {
          return undefined;
        },
      },
      crypto: nodesUtils.quicServerCrypto,
      logger,
    });
    const handleStream = async (
      event: quicEvents.EventQUICConnectionStream,
    ) => {
      // Streams are handled via the RPCServer.
      const stream = event.detail;
      logger.info('!!!!Handling new stream!!!!!');
      rpcServer.handleStream(stream);
    };
    const handleConnection = async (
      event: quicEvents.EventQUICServerConnection,
    ) => {
      // Needs to setup stream handler
      const conn = event.detail;
      logger.info('!!!!Handling new Connection!!!!!');
      conn.addEventListener(
        quicEvents.EventQUICConnectionStream.name,
        handleStream,
      );
      conn.addEventListener(
        quicEvents.EventQUICConnectionStopped.name,
        () => {
          conn.removeEventListener(
            quicEvents.EventQUICConnectionStream.name,
            handleStream,
          );
        },
        { once: true },
      );
    };
    quicServer.addEventListener(
      quicEvents.EventQUICServerConnection.name,
      handleConnection,
    );
    quicServer.addEventListener(
      quicEvents.EventQUICServerStopped.name,
      () => {
        quicServer.removeEventListener(
          quicEvents.EventQUICServerConnection.name,
          handleConnection,
        );
      },
      { once: true },
    );
    await quicServer.start({
      host: localHost,
    });

    // Setting up client
    rpcClient = new RPCClient({
      manifest: clientManifest,
      streamFactory: async () => {
        return quicClient.connection.newStream();
      },
      toError: networkUtils.toError,
      logger,
    });
    quicClient = await QUICClient.createQUICClient({
      crypto: nodesUtils.quicClientCrypto,
      config: {
        key: tlsConfigClient.keyPrivatePem,
        cert: tlsConfigClient.certChainPem,
        verifyPeer: true,
        verifyCallback: async () => {
          return undefined;
        },
      },
      host: localHost,
      port: quicServer.port,
      localHost: localHost,
      logger,
    });
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await quicServer.stop({ force: true });
    await rpcServer.stop({ force: true });
    await notificationsManager.stop();
    await nodeManager.stop();
    await nodeConnectionManager.stop();
    await sigchain.stop();
    await acl.stop();
    await nodeGraph.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
  });

  test('successfully sends a notification', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    // Set notify permission for sender on receiver
    await acl.setNodePerm(senderNodeId, {
      gestalt: { notify: null },
      vaults: {},
    });
    // Construct and send notification
    const notification: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'test',
      },
      iss: nodesUtils.encodeNodeId(senderNodeId),
      sub: nodesUtils.encodeNodeId(keyRing.getNodeId()),
      isRead: false,
    };
    const signedNotification = await notificationsUtils.generateNotification(
      notification,
      senderKeyRing.keyPair,
    );
    await rpcClient.methods.notificationsSend({
      signedNotificationEncoded: signedNotification,
    });
    // Check notification was received
    const receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(1);
    expect(receivedNotifications[0].data).toEqual(notification.data);
    expect(receivedNotifications[0].iss).toEqual(notification.iss);
    // Reverse side effects
    await notificationsManager.clearInboxNotifications();
    await acl.unsetNodePerm(senderNodeId);
  });
  test('cannot send invalidly formatted notification', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    // Set notify permission for sender on receiver
    await acl.setNodePerm(senderNodeId, {
      gestalt: { notify: null },
      vaults: {},
    });
    // Unsigned notification
    const notification1: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'test',
      },
      iss: nodesUtils.encodeNodeId(senderNodeId),
      sub: nodesUtils.encodeNodeId(keyRing.getNodeId()),
      isRead: false,
    };
    const token = Token.fromPayload(notification1);
    await testUtils.expectRemoteError(
      rpcClient.methods.notificationsSend({
        signedNotificationEncoded: JSON.stringify(
          token.toJSON(),
        ) as SignedNotification,
      }),
      notificationsErrors.ErrorNotificationsVerificationFailed,
    );
    // Check notification was not received
    let receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(0);
    // Improperly typed notification
    const notification2 = {
      data: {
        type: 'invalid',
      },
      senderId: senderNodeId,
      isRead: false,
    };
    const signedNotification = await notificationsUtils.generateNotification(
      // @ts-ignore: invalidly constructed notification
      notification2,
      senderKeyRing.keyPair,
    );
    await testUtils.expectRemoteError(
      rpcClient.methods.notificationsSend({
        signedNotificationEncoded: signedNotification,
      }),
      validationErrors.ErrorParse,
    );
    // Check notification was not received
    receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(0);
    // Reverse side effects
    await acl.unsetNodePerm(senderNodeId);
  });
  test('cannot send notification without permission', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    // Construct and send notification
    const notification: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'test',
      },
      iss: nodesUtils.encodeNodeId(senderNodeId),
      sub: nodesUtils.encodeNodeId(keyRing.getNodeId()),
      isRead: false,
    };
    const signedNotification = await notificationsUtils.generateNotification(
      notification,
      senderKeyRing.keyPair,
    );
    await testUtils.expectRemoteError(
      rpcClient.methods.notificationsSend({
        signedNotificationEncoded: signedNotification,
      }),
      notificationsErrors.ErrorNotificationsPermissionsNotFound,
    );
    // Check notification was not received
    const receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(0);
  });
});
