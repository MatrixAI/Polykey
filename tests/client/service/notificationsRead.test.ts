import type { Host, Port } from '@/network/types';
import type { VaultIdEncoded, VaultName } from '@/vaults/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
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
import GRPCClientClient from '@/client/GRPCClientClient';
import notificationsRead from '@/client/service/notificationsRead';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as notificationsPB from '@/proto/js/polykey/v1/notifications/notifications_pb';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as clientUtils from '@/client/utils';
import * as testUtils from '../../utils';
import * as testNodesUtils from '../../nodes/utils';

describe('notificationsRead', () => {
  const logger = new Logger('notificationsRead test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const nodeIdSender = testNodesUtils.generateRandomNodeId();
  const nodeIdSenderEncoded = nodesUtils.encodeNodeId(nodeIdSender);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  let mockedReadNotifications: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedReadNotifications = jest
      .spyOn(NotificationsManager.prototype, 'readNotifications')
      .mockResolvedValueOnce([
        {
          data: {
            type: 'General',
            message: 'test',
          },
          senderId: nodeIdSenderEncoded,
          isRead: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          data: {
            type: 'General',
            message: 'test1',
          },
          senderId: nodeIdSenderEncoded,
          isRead: true,
        },
        {
          data: {
            type: 'General',
            message: 'test2',
          },
          senderId: nodeIdSenderEncoded,
          isRead: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          data: {
            type: 'General',
            message: 'test2',
          },
          senderId: nodeIdSenderEncoded,
          isRead: true,
        },
        {
          data: {
            type: 'General',
            message: 'test1',
          },
          senderId: nodeIdSenderEncoded,
          isRead: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          data: {
            type: 'GestaltInvite',
          },
          senderId: nodeIdSenderEncoded,
          isRead: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          data: {
            type: 'VaultShare',
            vaultId: 'vault' as VaultIdEncoded,
            vaultName: 'vault' as VaultName,
            actions: {
              clone: null,
              pull: null,
            },
          },
          senderId: nodeIdSenderEncoded,
          isRead: true,
        },
      ])
      .mockResolvedValueOnce([]);
  });
  afterAll(async () => {
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
    mockedReadNotifications.mockRestore();
  });
  const authToken = 'abc123';
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
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
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
      nodeConnectionManager,
      nodeGraph,
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
    const clientService = {
      notificationsRead: notificationsRead({
        authenticate,
        notificationsManager,
        logger,
        db,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[ClientServiceService, clientService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientClient.createGRPCClientClient({
      nodeId: keyManager.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await notificationsManager.stop();
    await sigchain.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await queue.stop();
    await proxy.stop();
    await acl.stop();
    await db.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('reads a single notification', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(false);
    request.setNumber('1');
    request.setOrder('newest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(1);
    expect(output[0].hasGeneral()).toBeTruthy();
    expect(output[0].getGeneral()!.getMessage()).toBe('test');
    expect(output[0].getSenderId()).toBe(nodeIdSenderEncoded);
    expect(output[0].getIsRead()).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[0][0].number).toBe(1);
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('newest');
  });
  test('reads unread notifications', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(true);
    request.setNumber('all');
    request.setOrder('newest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(2);
    expect(output[0].hasGeneral()).toBeTruthy();
    expect(output[0].getGeneral()!.getMessage()).toBe('test1');
    expect(output[0].getSenderId()).toBe(nodeIdSenderEncoded);
    expect(output[0].getIsRead()).toBeTruthy();
    expect(output[1].hasGeneral()).toBeTruthy();
    expect(output[1].getGeneral()!.getMessage()).toBe('test2');
    expect(output[1].getSenderId()).toBe(nodeIdSenderEncoded);
    expect(output[1].getIsRead()).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[1][0].unread).toBeTruthy();
    expect(mockedReadNotifications.mock.calls[1][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[1][0].order).toBe('newest');
  });
  test('reads notifications in reverse order', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(false);
    request.setNumber('all');
    request.setOrder('oldest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(2);
    expect(output[0].hasGeneral()).toBeTruthy();
    expect(output[0].getGeneral()!.getMessage()).toBe('test2');
    expect(output[0].getSenderId()).toBe(nodeIdSenderEncoded);
    expect(output[0].getIsRead()).toBeTruthy();
    expect(output[1].hasGeneral()).toBeTruthy();
    expect(output[1].getGeneral()!.getMessage()).toBe('test1');
    expect(output[1].getSenderId()).toBe(nodeIdSenderEncoded);
    expect(output[1].getIsRead()).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[2][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[2][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[2][0].order).toBe('oldest');
  });
  test('reads gestalt invite notifications', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(false);
    request.setNumber('all');
    request.setOrder('newest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(1);
    expect(output[0].hasGestaltInvite()).toBeTruthy();
    expect(output[0].getGestaltInvite()).toBe('GestaltInvite');
    expect(output[0].getSenderId()).toBe(nodeIdSenderEncoded);
    expect(output[0].getIsRead()).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[3][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[3][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[3][0].order).toBe('newest');
  });
  test('reads vault share notifications', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(false);
    request.setNumber('all');
    request.setOrder('newest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(1);
    expect(output[0].hasVaultShare()).toBeTruthy();
    expect(output[0].getVaultShare()!.getVaultId()).toBe('vault');
    expect(output[0].getVaultShare()!.getVaultName()).toBe('vault');
    expect(output[0].getVaultShare()!.getActionsList()).toContain('clone');
    expect(output[0].getVaultShare()!.getActionsList()).toContain('pull');
    expect(output[0].getSenderId()).toBe(nodeIdSenderEncoded);
    expect(output[0].getIsRead()).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[4][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[4][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[4][0].order).toBe('newest');
  });
  test('reads no notifications', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(false);
    request.setNumber('all');
    request.setOrder('newest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(0);
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[5][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[5][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[5][0].order).toBe('newest');
  });
});
