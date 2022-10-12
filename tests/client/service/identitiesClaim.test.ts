import type { ClaimLinkIdentity } from '@/claims/types';
import type { NodeIdEncoded } from '@/ids/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import type { Host, Port } from '@/network/types';
import type NodeManager from '@/nodes/NodeManager';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import TaskManager from '@/tasks/TaskManager';
import KeyRing from '@/keys/KeyRing';
import IdentitiesManager from '@/identities/IdentitiesManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import Sigchain from '@/sigchain/Sigchain';
import Proxy from '@/network/Proxy';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import identitiesClaim from '@/client/service/identitiesClaim';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as clientUtils from '@/client/utils/utils';
import * as claimsUtils from '@/claims/utils';
import * as nodesUtils from '@/nodes/utils';
import * as validationErrors from '@/validation/errors';
import TestProvider from '../../identities/TestProvider';
import * as testUtils from '../../utils';
import * as keysUtils from '@/keys/utils/index';
import { CertificatePEMChain } from '@/keys/types';

describe('identitiesClaim', () => {
  const logger = new Logger('identitiesClaim test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    tokenData: {
      accessToken: 'abc123',
    },
  };
  const claimData: ClaimLinkIdentity = {
    type: 'identity',
    node: 'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg' as NodeIdEncoded,
    provider: testToken.providerId,
    identity: testToken.identityId,
  };
  const claimId = claimsUtils.createClaimIdGenerator(
    nodesUtils.decodeNodeId(claimData.node)!,
  )();
  let mockedAddClaim: jest.SpyInstance;
  const dummyNodeManager = { setNode: jest.fn() } as unknown as NodeManager;
  beforeAll(async () => {
    const privateKey = keysUtils.generateKeyPair().privateKey;
    const claim = await claimsUtils.createClaim({
      privateKey: privateKey,
      hPrev: null,
      seq: 0,
      data: claimData,
      kid: claimData.node,
    });
    mockedAddClaim = jest
      .spyOn(Sigchain.prototype, 'addClaim')
      .mockResolvedValue([claimId, claim]);
  });
  afterAll(async () => {
    mockedAddClaim.mockRestore();
  });
  const authToken = 'abc123';
  let dataDir: string;
  let testProvider: TestProvider;
  let identitiesManager: IdentitiesManager;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let sigchain: Sigchain;
  let proxy: Proxy;

  let db: DB;
  let keyRing: KeyRing;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      logger,
    });
    testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
    proxy = new Proxy({
      authToken,
      logger,
    });
    await proxy.start({
      serverHost: '127.0.0.1' as Host,
      serverPort: 0 as Port,
      tlsConfig: {
        keyPrivatePem: keysUtils.privateKeyToPEM(keyRing.keyPair.privateKey),
        certChainPem: keysUtils.publicKeyToPEM(keyRing.keyPair.publicKey) as unknown as CertificatePEMChain,
      },
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
    nodeConnectionManager = new NodeConnectionManager({
      connConnectTime: 2000,
      proxy,
      keyRing,
      nodeGraph,
      taskManager,
      logger: logger.getChild('NodeConnectionManager'),
    });
    await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
    await taskManager.startProcessing();
    const clientService = {
      identitiesClaim: identitiesClaim({
        authenticate,
        identitiesManager,
        sigchain,
        keyRing,
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
      nodeId: keyRing.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await grpcClient.destroy();
    await grpcServer.stop();
    await nodeConnectionManager.stop();
    await nodeGraph.stop();
    await sigchain.stop();
    await proxy.stop();
    await identitiesManager.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('claims identity', async () => {
    // Need an authenticated identity
    await identitiesManager.putToken(
      testToken.providerId,
      testToken.identityId,
      testToken.tokenData,
    );
    const request = new identitiesPB.Provider();
    request.setIdentityId(testToken.identityId);
    request.setProviderId(testToken.providerId);
    const response = await grpcClient.identitiesClaim(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(identitiesPB.Claim);
    expect(response.getClaimId()).toBe('0');
    expect(response.getUrl()).toBe('test.com');
    // Reverse side-effects
    testProvider.linkIdCounter = 0;
    testProvider.links = {};
    await identitiesManager.delToken(
      testToken.providerId,
      testToken.identityId,
    );
  });
  test('cannot claim invalid identity', async () => {
    const request = new identitiesPB.Provider();
    request.setIdentityId('');
    request.setProviderId(testToken.providerId);
    await testUtils.expectRemoteError(
      grpcClient.identitiesClaim(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      validationErrors.ErrorValidation,
    );
    request.setIdentityId(testToken.identityId);
    request.setProviderId('');
    await testUtils.expectRemoteError(
      grpcClient.identitiesClaim(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      validationErrors.ErrorValidation,
    );
    request.setIdentityId('');
    request.setProviderId('');
    await testUtils.expectRemoteError(
      grpcClient.identitiesClaim(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      validationErrors.ErrorValidation,
    );
  });
});
