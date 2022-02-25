import type { ClaimLinkIdentity } from '@/claims/types';
import type { NodeIdEncoded } from '@/nodes/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import KeyManager from '@/keys/KeyManager';
import IdentitiesManager from '@/identities/IdentitiesManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import Sigchain from '@/sigchain/Sigchain';
import ForwardProxy from '@/network/ForwardProxy';
import ReverseProxy from '@/network/ReverseProxy';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import identitiesClaim from '@/client/service/identitiesClaim';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as clientUtils from '@/client/utils/utils';
import * as keysUtils from '@/keys/utils';
import * as claimsUtils from '@/claims/utils';
import * as validationErrors from '@/validation/errors';
import * as testUtils from '../../utils';
import TestProvider from '../../identities/TestProvider';

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
  const claimId = claimsUtils.createClaimIdGenerator(claimData.node)();
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  let mockedAddClaim: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    const claim = await claimsUtils.createClaim({
      privateKey: keysUtils.keyPairToPem(globalKeyPair).privateKey,
      hPrev: null,
      seq: 0,
      data: claimData,
      kid: claimData.node,
    });
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedAddClaim = jest
      .spyOn(Sigchain.prototype, 'addClaim')
      .mockResolvedValue([claimId, claim]);
  });
  afterAll(async () => {
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
    mockedAddClaim.mockRestore();
  });
  const authToken = 'abc123';
  let dataDir: string;
  let testProvider: TestProvider;
  let identitiesManager: IdentitiesManager;
  let nodeGraph: NodeGraph;
  let nodeConnectionManager: NodeConnectionManager;
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
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      logger,
    });
    testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
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
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger: logger.getChild('NodeGraph'),
    });
    nodeConnectionManager = new NodeConnectionManager({
      connConnectTime: 2000,
      fwdProxy,
      keyManager,
      nodeGraph,
      revProxy,
      logger: logger.getChild('nodeConnectionManager'),
    });
    await nodeConnectionManager.start();
    const clientService = {
      identitiesClaim: identitiesClaim({
        authenticate,
        identitiesManager,
        sigchain,
        keyManager,
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
    await nodeConnectionManager.stop();
    await nodeGraph.stop();
    await sigchain.stop();
    await revProxy.stop();
    await fwdProxy.stop();
    await identitiesManager.stop();
    await db.stop();
    await keyManager.stop();
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
    await expect(
      grpcClient.identitiesClaim(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
    ).rejects.toThrow(validationErrors.ErrorValidation);
    request.setIdentityId(testToken.identityId);
    request.setProviderId('');
    await expect(
      grpcClient.identitiesClaim(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
    ).rejects.toThrow(validationErrors.ErrorValidation);
    request.setIdentityId('');
    request.setProviderId('');
    await expect(
      grpcClient.identitiesClaim(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
    ).rejects.toThrow(validationErrors.ErrorValidation);
  });
});
