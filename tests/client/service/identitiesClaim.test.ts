import type { Host, Port } from '@/network/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import type { ClaimLinkIdentity } from '@/claims/types';
import type { NodeIdEncoded } from '@/nodes/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import { DB } from '@matrixai/db';
import { KeyManager, utils as keysUtils } from '@/keys';
import { GRPCServer } from '@/grpc';
import { IdentitiesManager } from '@/identities';
import { NodeManager } from '@/nodes';
import { Sigchain } from '@/sigchain';
import { ForwardProxy, ReverseProxy } from '@/network';
import {
  GRPCClientClient,
  ClientServiceService,
  utils as clientUtils,
} from '@/client';
import identitiesClaim from '@/client/service/identitiesClaim';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as claimsUtils from '@/claims/utils';
import TestProvider from '../../identities/TestProvider';
import * as testUtils from '../../utils';

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
  let nodeManager: NodeManager;
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
    nodeManager = await NodeManager.createNodeManager({
      db,
      keyManager,
      sigchain,
      fwdProxy,
      revProxy,
      logger,
    });
    const clientService = {
      identitiesClaim: identitiesClaim({
        authenticate,
        identitiesManager,
        sigchain,
        nodeManager,
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
    await nodeManager.stop();
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
});
