import type * as grpc from '@grpc/grpc-js';
import type { IdentitiesManager } from '@/identities';
import type { IdentityId, ProviderId } from '@/identities/types';
import type { ClientServiceClient } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import { KeyManager } from '@/keys';
import { ForwardProxy } from '@/network';
import * as grpcUtils from '@/grpc/utils';
import * as testUtils from './utils';
import TestProvider from '../identities/TestProvider';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

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
describe('Identities Client service', () => {
  const password = 'password';
  const logger = new Logger('IdentitiesClientServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: ClientServiceClient;
  let server: grpc.Server;
  let port: number;
  let dataDir: string;
  let polykeyAgent: PolykeyAgent;
  let keyManager: KeyManager;
  let identitiesManager: IdentitiesManager;
  let passwordFile: string;
  let callCredentials: grpc.Metadata;

  let testProvider: TestProvider;
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    tokenData: {
      accessToken: 'abc123',
    },
  };

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

    identitiesManager = polykeyAgent.identitiesManager;

    // Adding provider.
    testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);

    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
      secure: false,
    });

    client = await testUtils.openSimpleClientClient(port);
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

  test('should authenticate an identity', async () => {
    const identitiesAuthenticate =
      grpcUtils.promisifyReadableStreamCall<identitiesPB.AuthenticationProcess>(
        client,
        client.identitiesAuthenticate,
      );

    const providerMessage = new identitiesPB.Provider();
    providerMessage.setProviderId(testToken.providerId);
    providerMessage.setIdentityId(testToken.identityId);

    const genReadable = identitiesAuthenticate(
      providerMessage,
      callCredentials,
    );
    let step = 0;
    for await (const message of genReadable) {
      if (step === 0) {
        expect(message.getStepCase()).toBe(
          identitiesPB.AuthenticationProcess.StepCase.REQUEST,
        );
        const authRequest = message.getRequest()!;
        expect(authRequest.getUrl()).toBe('test.com');
        expect(authRequest.getDataMap().get('userCode')).toBe('randomtestcode');
      }
      if (step === 1) {
        expect(message.getStepCase()).toBe(
          identitiesPB.AuthenticationProcess.StepCase.RESPONSE,
        );
        const authResponse = message.getResponse()!;
        expect(authResponse.getIdentityId()).toBe(testToken.identityId);
      }
      step++;
    }
    expect(
      await polykeyAgent.identitiesManager.getToken(
        testToken.providerId,
        testToken.identityId,
      ),
    ).toEqual(testToken.tokenData);
    expect(genReadable.stream.destroyed).toBeTruthy();
    await polykeyAgent.identitiesManager.delToken(
      testToken.providerId,
      testToken.identityId,
    );
  });
  test('should manipulate tokens for providers', async () => {
    const putToken = grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      client,
      client.identitiesTokenPut,
    );

    const getTokens = grpcUtils.promisifyUnaryCall<identitiesPB.Token>(
      client,
      client.identitiesTokenGet,
    );

    const delToken = grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      client,
      client.identitiesTokenDelete,
    );
    const providerId = 'test-provider' as ProviderId;
    const identityId = 'test-user' as IdentityId;
    const tokenData = {
      accessToken: 'abc',
    };

    const mp = new identitiesPB.Provider();
    const m = new identitiesPB.TokenSpecific();

    mp.setProviderId(providerId);
    mp.setIdentityId(identityId);

    m.setProvider(mp);
    m.setToken('abc');

    await putToken(m, callCredentials);

    const tokenData_ = await getTokens(mp, callCredentials);
    expect(JSON.stringify(tokenData)).toStrictEqual(tokenData_.getToken());

    await delToken(mp, callCredentials);
    await delToken(mp, callCredentials);
    const tokenData__ = await getTokens(mp, callCredentials);
    expect(tokenData__.getToken()).toBe('');
  });
  test('should list providers.', async () => {
    const providersGet = grpcUtils.promisifyUnaryCall<identitiesPB.Provider>(
      client,
      client.identitiesProvidersList,
    );

    const emptyMessage = new utilsPB.EmptyMessage();
    const test = await providersGet(emptyMessage, callCredentials);
    expect(test.getProviderId()).toContain('test-provider');
  });
  test('should list connected Identities.', async () => {
    const identitiesGetConnectedInfos =
      grpcUtils.promisifyReadableStreamCall<identitiesPB.Info>(
        client,
        client.identitiesInfoGetConnected,
      );

    // Add the identity + token
    await identitiesManager.putToken(
      testToken.providerId,
      testToken.identityId,
      testToken.tokenData,
    );

    const providerSearchMessage = new identitiesPB.ProviderSearch();
    const providerMessage = new identitiesPB.Provider();
    providerMessage.setProviderId(testToken.providerId);
    providerMessage.setIdentityId(testToken.identityId);
    providerSearchMessage.setProvider(providerMessage);
    providerSearchMessage.setSearchTermList([]);

    const resGen = identitiesGetConnectedInfos(
      providerSearchMessage,
      callCredentials,
    );
    let output = '';
    for await (const identityInfoMessage of resGen) {
      const objString = JSON.stringify(identityInfoMessage.toObject());
      output += objString;
    }
    expect(output).toContain('test_user2');
    expect(output).toContain('test_user2@test.com');
  });
  test('should get identity info.', async () => {
    const identitiesGetInfo =
      grpcUtils.promisifyUnaryCall<identitiesPB.Provider>(
        client,
        client.identitiesInfoGet,
      );

    await identitiesManager.putToken(
      testToken.providerId,
      testToken.identityId,
      testToken.tokenData,
    );
    const providerMessage1 = new identitiesPB.Provider();
    providerMessage1.setProviderId(testToken.providerId);
    const providerMessage = await identitiesGetInfo(
      providerMessage1,
      callCredentials,
    );
    expect(providerMessage.getProviderId()).toBe(testToken.providerId);
    expect(providerMessage.getIdentityId()).toBe(testToken.identityId);
  });
  test('should claim an identity.', async () => {
    const identitiesClaim = grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      client,
      client.identitiesClaim,
    );
    // Need an authenticated identity
    await identitiesManager.putToken(
      testToken.providerId,
      testToken.identityId,
      testToken.tokenData,
    );

    const providerMessage = new identitiesPB.Provider();
    providerMessage.setProviderId(testToken.providerId);
    providerMessage.setIdentityId(testToken.identityId);
    await identitiesClaim(providerMessage, callCredentials);

    const claim = await (
      await testProvider
        .getClaims(testToken.identityId, testToken.identityId)
        .next()
    ).value;
    expect(claim.payload.data.type).toBe('identity');
    expect(claim.payload.data.provider).toBe(testToken.providerId);
    expect(claim.payload.data.identity).toBe(testToken.identityId);
    expect(claim.payload.data.node).toBe(polykeyAgent.nodeManager.getNodeId());

    await polykeyAgent.identitiesManager.delToken(
      testToken.providerId,
      testToken.identityId,
    );
    testProvider.links = {};
    testProvider.linkIdCounter = 0;
  });
});
