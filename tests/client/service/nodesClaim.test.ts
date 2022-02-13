import type { Host, Port } from '@/network/types';
import type { Notification } from '@/notifications/types';
import type { NodeIdEncoded } from '@/nodes/types';
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
import { NotificationsManager } from '@/notifications';
import { ACL } from '@/acl';
import {
  GRPCClientClient,
  ClientServiceService,
  utils as clientUtils,
} from '@/client';
import nodesClaim from '@/client/service/nodesClaim';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as validationErrors from '@/validation/errors';
import * as testUtils from '../../utils';

describe('nodesClaim', () => {
  const logger = new Logger('nodesClaim test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const dummyNotification: Notification = {
    data: {
      type: 'GestaltInvite',
    },
    senderId:
      'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg' as NodeIdEncoded,
    isRead: false,
  };
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  let mockedFindGestaltInvite: jest.SpyInstance;
  let mockedSendNotification: jest.SpyInstance;
  let mockedClaimNode: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedFindGestaltInvite = jest
      .spyOn(NotificationsManager.prototype, 'findGestaltInvite')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValue(dummyNotification);
    mockedSendNotification = jest
      .spyOn(NotificationsManager.prototype, 'sendNotification')
      .mockResolvedValue(undefined);
    mockedSendNotification = jest
      .spyOn(NodeManager.prototype, 'claimNode')
      .mockResolvedValue(undefined);
  });
  afterAll(async () => {
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
    mockedFindGestaltInvite.mockRestore();
    mockedSendNotification.mockRestore();
    mockedClaimNode.mockRestore();
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
      nodesClaim: nodesClaim({
        authenticate,
        nodeManager,
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
  test('sends a gestalt invite (none existing)', async () => {
    const request = new nodesPB.Claim();
    request.setNodeId('vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0');
    request.setForceInvite(false);
    const response = await grpcClient.nodesClaim(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.StatusMessage);
    // Does not claim (sends gestalt invite)
    expect(response.getSuccess()).toBeFalsy();
  });
  test('sends a gestalt invite (force invite)', async () => {
    const request = new nodesPB.Claim();
    request.setNodeId('vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0');
    request.setForceInvite(true);
    const response = await grpcClient.nodesClaim(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.StatusMessage);
    // Does not claim (sends gestalt invite)
    expect(response.getSuccess()).toBeFalsy();
  });
  test('claims a node', async () => {
    const request = new nodesPB.Claim();
    request.setNodeId('vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0');
    request.setForceInvite(false);
    const response = await grpcClient.nodesClaim(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.StatusMessage);
    expect(response.getSuccess()).toBeTruthy();
  });
  test('cannot claim an invalid node', async () => {
    const request = new nodesPB.Claim();
    request.setNodeId('nodeId');
    await expect(
      grpcClient.nodesClaim(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
    ).rejects.toThrow(validationErrors.ErrorValidation);
  });
});
