import type * as grpc from '@grpc/grpc-js';
import type { NodeInfo, NodeAddress } from '@/nodes/types';
import type { NodeManager } from '@/nodes';
import type { NotificationData } from '@/notifications/types';
import type { ClientServiceClient } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { utils as idUtils } from '@matrixai/id';

import { PolykeyAgent } from '@';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as notificationsPB from '@/proto/js/polykey/v1/notifications/notifications_pb';
import { KeyManager } from '@/keys';
import { ForwardProxy } from '@/network';
import * as grpcUtils from '@/grpc/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as testUtils from './utils';
import * as testKeynodeUtils from '../utils';

/**
 * This test file has been optimised to use only one instance of PolykeyAgent where posible.
 * Setting up the PolykeyAgent has been done in a beforeAll block.
 * Keep this in mind when adding or editing tests.
 * Any side effects need to be undone when the test has completed.
 * Preferably within a `afterEach()` since any cleanup will be skipped inside a failing test.
 *
 * - left over state can cause a test to fail in certain cases.
 * - left over state can cause similar tests to succeed when they should fail.
 * - starting or stopping the agent within tests should be done on a new instance of the polykey agent.
 * - when in doubt test each modified or added test on it's own as well as the whole file.
 * - Looking into adding a way to safely clear each domain's DB information with out breaking modules.
 */
describe('Notifications client service', () => {
  const password = 'password';
  const logger = new Logger('NotificationsClientServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: ClientServiceClient;
  let server: grpc.Server;
  let port: number;
  let dataDir: string;
  let polykeyAgent: PolykeyAgent;
  let keyManager: KeyManager;
  let nodeManager: NodeManager;
  let passwordFile: string;
  let callCredentials: grpc.Metadata;
  let node1: NodeInfo;

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    passwordFile = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordFile, 'password');
    const keysPath = path.join(dataDir, 'keys');

    keyManager = await KeyManager.createKeyManager({
      keysPath,
      password,
      logger,
    });

    const fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });

    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: dataDir,
      logger,
      fwdProxy,
      keyManager,
    });

    nodeManager = polykeyAgent.nodeManager;

    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
      secure: false,
    });

    client = await testUtils.openSimpleClientClient(port);

    node1 = {
      id: nodeManager.getNodeId(),
      chain: {},
    };
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await testUtils.closeTestClientServer(server);
    testUtils.closeSimpleClientClient(client);

    await polykeyAgent.stop();
    await polykeyAgent.destroy();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await fs.promises.rm(passwordFile);
  });
  beforeEach(async () => {
    const sessionToken = await polykeyAgent.sessionManager.createToken();
    callCredentials = testUtils.createCallCredentials(sessionToken);
  });

  describe('Notifications RPC', () => {
    let receiver: PolykeyAgent;
    let sender: PolykeyAgent;
    beforeAll(async () => {
      receiver = await testKeynodeUtils.setupRemoteKeynode({ logger });
      sender = await testKeynodeUtils.setupRemoteKeynode({ logger });

      await sender.nodeManager.setNode(node1.id, {
        ip: polykeyAgent.revProxy.ingressHost,
        port: polykeyAgent.revProxy.ingressPort,
      } as NodeAddress);
      await receiver.acl.setNodePerm(node1.id, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      await polykeyAgent.acl.setNodePerm(sender.nodeManager.getNodeId(), {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
    }, global.polykeyStartupTimeout * 2);
    afterAll(async () => {
      await testKeynodeUtils.cleanupRemoteKeynode(receiver);
      await testKeynodeUtils.cleanupRemoteKeynode(sender);
    });
    afterEach(async () => {
      await receiver.notificationsManager.clearNotifications();
      await sender.notificationsManager.clearNotifications();
      await polykeyAgent.notificationsManager.clearNotifications();
    });
    test('should send notifications.', async () => {
      // Set up a remote node receiver and add its details to agent
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, receiver);

      const notificationsSend =
        grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
          client,
          client.notificationsSend,
        );

      const notificationsSendMessage = new notificationsPB.Send();
      const generalMessage = new notificationsPB.General();
      generalMessage.setMessage('msg');
      notificationsSendMessage.setReceiverId(receiver.nodeManager.getNodeId());
      notificationsSendMessage.setData(generalMessage);

      // Send notification returns nothing - check remote node received clientPB
      await notificationsSend(notificationsSendMessage, callCredentials);
      const notifs = await receiver.notificationsManager.readNotifications();
      expect(notifs[0].data).toEqual({
        type: 'General',
        message: 'msg',
      });
      expect(notifs[0].senderId).toEqual(polykeyAgent.nodeManager.getNodeId());
      expect(notifs[0].isRead).toBeTruthy();
    });
    test('should read all notifications.', async () => {
      const generalData = {
        type: 'General',
        message: 'msg',
      } as NotificationData;
      const gestaltInviteData = {
        type: 'GestaltInvite',
      } as NotificationData;
      const vaultShareData = {
        type: 'VaultShare',
        vaultId: vaultsUtils
          .makeVaultId(idUtils.fromString('Vault1xxxxxxxxxx'))
          .toString(),
        vaultName: 'vaultName',
        actions: {
          pull: null,
          clone: null,
        },
      } as NotificationData;

      await sender.notificationsManager.sendNotification(node1.id, generalData);
      await sender.notificationsManager.sendNotification(
        node1.id,
        gestaltInviteData,
      );
      await sender.notificationsManager.sendNotification(
        node1.id,
        vaultShareData,
      );

      const notificationsRead =
        grpcUtils.promisifyUnaryCall<notificationsPB.List>(
          client,
          client.notificationsRead,
        );

      const notificationsReadMessage = new notificationsPB.Read();
      notificationsReadMessage.setUnread(false);
      notificationsReadMessage.setNumber('all');
      notificationsReadMessage.setOrder('newest');

      // Check the read call
      const response = await notificationsRead(
        notificationsReadMessage,
        callCredentials,
      );
      const notifs = response.getNotificationList();
      expect(notifs[0].hasVaultShare()).toBeTruthy();
      expect(notifs[0].getSenderId()).toEqual(sender.nodeManager.getNodeId());
      expect(notifs[0].getIsRead()).toBeTruthy();
      expect(notifs[1].hasGestaltInvite()).toBeTruthy();
      expect(notifs[1].getSenderId()).toEqual(sender.nodeManager.getNodeId());
      expect(notifs[1].getIsRead()).toBeTruthy();
      expect(notifs[2].hasGeneral()).toBeTruthy();
      expect(notifs[2].getSenderId()).toEqual(sender.nodeManager.getNodeId());
      expect(notifs[2].getIsRead()).toBeTruthy();
    });
    test('should read a single notification.', async () => {
      const msgData1 = {
        type: 'General',
        message: 'msg1',
      } as NotificationData;
      const msgData2 = {
        type: 'General',
        message: 'msg2',
      } as NotificationData;
      const msgData3 = {
        type: 'General',
        message: 'msg3',
      } as NotificationData;

      await sender.notificationsManager.sendNotification(node1.id, msgData1);
      await sender.notificationsManager.sendNotification(node1.id, msgData2);
      await sender.notificationsManager.sendNotification(node1.id, msgData3);

      const notificationsRead =
        grpcUtils.promisifyUnaryCall<notificationsPB.List>(
          client,
          client.notificationsRead,
        );

      const notificationsReadMessage = new notificationsPB.Read();
      notificationsReadMessage.setUnread(false);
      notificationsReadMessage.setNumber('1');
      notificationsReadMessage.setOrder('newest');

      // Check the read call
      const response = await notificationsRead(
        notificationsReadMessage,
        callCredentials,
      );
      const notifs = response.getNotificationList();
      expect(notifs).toHaveLength(1);
      expect(notifs[0].getGeneral()!.getMessage()).toEqual('msg3');
    });
    test('should clear all notifications.', async () => {
      const msgData1 = {
        type: 'General',
        message: 'msg1',
      } as NotificationData;
      const msgData2 = {
        type: 'General',
        message: 'msg2',
      } as NotificationData;

      await sender.notificationsManager.sendNotification(node1.id, msgData1);
      await sender.notificationsManager.sendNotification(node1.id, msgData2);

      const notificationsClear =
        grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
          client,
          client.notificationsClear,
        );

      const emptyMessage = new utilsPB.EmptyMessage();
      await notificationsClear(emptyMessage, callCredentials);

      // Call read notifications to check there are none
      const notifs =
        await polykeyAgent.notificationsManager.readNotifications();
      expect(notifs).toEqual([]);
    });
  });
});
