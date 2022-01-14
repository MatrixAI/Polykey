import type { Host, Port } from '@/network/types';
import type { SignedNotification } from '@/notifications/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import { DB } from '@matrixai/db';
import { KeyManager, utils as keysUtils } from '@/keys';
import { GRPCServer } from '@/grpc';
import { NodeManager } from '@/nodes';
import { Sigchain } from '@/sigchain';
import { ForwardProxy, ReverseProxy } from '@/network';
import {
  NotificationsManager,
  utils as notificationsUtils,
} from '@/notifications';
import { ACL } from '@/acl';
import {
  GRPCClientClient,
  ClientServiceService,
  utils as clientUtils,
} from '@/client';
import notificationsSend from '@/client/service/notificationsSend';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as notificationsPB from '@/proto/js/polykey/v1/notifications/notifications_pb';
import * as testUtils from '../../utils';

describe('notificationsSend', () => {
  const logger = new Logger('notificationsSend test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  let mockedSignNotification: jest.SpyInstance;
  let mockedSendNotification: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedSignNotification = jest
      .spyOn(notificationsUtils, 'signNotification')
      .mockImplementation(async () => {
        return 'signedNotification' as SignedNotification;
      });
    mockedSendNotification = jest
      .spyOn(NodeManager.prototype, 'sendNotification')
      .mockResolvedValue(undefined);
  });
  afterAll(async () => {
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
    mockedSignNotification.mockRestore();
    mockedSendNotification.mockRestore();
  });
  const authToken = 'abc123';
  let dataDir: string;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;
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
    fwdProxy = new ForwardProxy({
      authToken,
      logger,
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      },
    });
    revProxy = new ReverseProxy({ logger });
    await revProxy.start({
      serverHost: '1.1.1.1' as Host,
      serverPort: 1 as Port,
      tlsConfig: {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      },
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyManager,
      logger,
    });
    nodeManager = await NodeManager.createNodeManager({
      db,
      keyManager,
      sigchain,
      fwdProxy,
      revProxy,
      logger,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        keyManager,
        logger,
      });
    const clientService = {
      notificationsSend: notificationsSend({
        authenticate,
        notificationsManager,
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
      port: grpcServer.port,
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await notificationsManager.stop();
    await nodeManager.stop();
    await sigchain.stop();
    await revProxy.stop();
    await fwdProxy.stop();
    await acl.stop();
    await db.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('sends a notification', async () => {
    const generalMessage = new notificationsPB.General();
    generalMessage.setMessage('test');
    const request = new notificationsPB.Send();
    request.setData(generalMessage);
    request.setReceiverId(
      'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
    );
    const response = await grpcClient.notificationsSend(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    // Check we signed and sent the notification
    expect(mockedSignNotification.mock.calls.length).toBe(1);
    expect(mockedSendNotification.mock.calls.length).toBe(1);
    expect(mockedSendNotification.mock.calls[0][0]).toBe(
      'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
    );
    expect(mockedSendNotification.mock.calls[0][1]).toBe('signedNotification');
    // Check notification content
    expect(mockedSignNotification.mock.calls[0][0]).toEqual({
      data: {
        type: 'General',
        message: 'test',
      },
      senderId: keyManager.getNodeId(),
      isRead: false,
    });
  });
});
