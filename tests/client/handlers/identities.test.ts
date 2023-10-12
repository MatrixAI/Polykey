import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { IdentityId, ProviderId } from '@/ids';
import type {
  ClientRPCResponseResult,
  IdentityInfoMessage,
  IdentityMessage,
} from '@/client/types';
import type { TLSConfig } from '@/network/types';
import type { Claim } from '@/claims/types';
import type { ClaimLinkIdentity } from '@/claims/payloads';
import type ACL from '@/acl/ACL';
import type NotificationsManager from '@/notifications/NotificationsManager';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { RPCClient } from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import Token from '@/tokens/Token';
import Sigchain from '@/sigchain/Sigchain';
import KeyRing from '@/keys/KeyRing';
import IdentitiesManager from '@/identities/IdentitiesManager';
import ClientService from '@/client/ClientService';
import {
  IdentitiesAuthenticate,
  IdentitiesAuthenticatedGet,
  IdentitiesClaim,
  IdentitiesInfoConnectedGet,
  IdentitiesInfoGet,
  IdentitiesInvite,
  IdentitiesProvidersList,
  IdentitiesTokenDelete,
  IdentitiesTokenGet,
  IdentitiesTokenPut,
} from '@/client/handlers';
import {
  identitiesAuthenticate,
  identitiesAuthenticatedGet,
  identitiesClaim,
  identitiesInfoConnectedGet,
  identitiesInfoGet,
  identitiesInvite,
  identitiesProvidersList,
  identitiesTokenDelete,
  identitiesTokenGet,
  identitiesTokenPut,
} from '@/client/callers';
import { encodeProviderIdentityId } from '@/ids';
import * as keysUtils from '@/keys/utils';
import * as validationErrors from '@/validation/errors';
import * as claimsUtils from '@/claims/utils';
import * as nodesUtils from '@/nodes/utils';
import * as identitiesErrors from '@/identities/errors';
import * as networkUtils from '@/network/utils';
import * as testUtils from '../../utils';
import * as testsUtils from '../../utils';
import TestProvider from '../../identities/TestProvider';

describe('identitiesAuthenticate', () => {
  const logger = new Logger('identitiesAuthenticate test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    identitiesAuthenticate: typeof identitiesAuthenticate;
  }>;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;
  let testProvider: TestProvider;
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    providerToken: {
      accessToken: 'abc123',
    },
  };
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        identitiesAuthenticate: new IdentitiesAuthenticate({
          identitiesManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        identitiesAuthenticate,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('authenticates identity', async () => {
    const request = {
      providerId: testToken.providerId,
    };
    const response = await rpcClient.methods.identitiesAuthenticate(request);
    let step = 0;
    for await (const message of response) {
      if (step === 0) {
        expect(message.request).toBeDefined();
        expect(message.response).toBeUndefined();
        const authRequest = message.request!;
        expect(authRequest.url).toBe('test.com');
        expect(authRequest.dataMap['userCode']).toBe('randomtestcode');
      }
      if (step === 1) {
        expect(message.request).toBeUndefined();
        expect(message.response).toBeDefined();
        const authResponse = message.response!;
        expect(authResponse.identityId).toBe(testToken.identityId);
      }
      if (step > 1) fail('Too many steps');
      step++;
    }
    expect(
      await identitiesManager.getToken(
        testToken.providerId,
        testToken.identityId,
      ),
    ).toEqual(testToken.providerToken);
    await identitiesManager.delToken(
      testToken.providerId,
      testToken.identityId,
    );
  });
  test('cannot authenticate invalid provider', async () => {
    const request = {
      providerId: '',
    };
    const response = await rpcClient.methods.identitiesAuthenticate(request);
    const reader = response.getReader();
    await testUtils.expectRemoteError(
      reader.read(),
      validationErrors.ErrorValidation,
    );
  });
});
describe('identitiesAuthenticatedGet', () => {
  const logger = new Logger('identitiesAuthenticatedGet test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    identitiesAuthenticatedGet: typeof identitiesAuthenticatedGet;
  }>;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;
  const providerToken = {
    accessToken: 'abc123',
  };

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        identitiesAuthenticatedGet: new IdentitiesAuthenticatedGet({
          identitiesManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        identitiesAuthenticatedGet,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets an authenticated identity', async () => {
    // Setup provider
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
    };
    provider.users['user1'] = user1;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      user1.providerId,
      user1.identityId,
      providerToken,
    );
    const response = await rpcClient.methods.identitiesAuthenticatedGet({});
    const output = Array<ClientRPCResponseResult<IdentityMessage>>();
    for await (const providerMessage of response) {
      output.push(providerMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual(user1);
  });
  test('does not get an unauthenticated identity', async () => {
    // Setup provider
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
    };
    provider.users['user1'] = user1;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      user1.providerId,
      user1.identityId,
      providerToken,
    );
    await identitiesManager.delToken(user1.providerId, user1.identityId);
    const response = await rpcClient.methods.identitiesAuthenticatedGet({});
    const output = Array<ClientRPCResponseResult<IdentityMessage>>();
    for await (const providerMessage of response) {
      output.push(providerMessage);
    }
    expect(output).toHaveLength(0);
  });
  test('gets authenticated identities from multiple providers', async () => {
    // Setup providers
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
    };
    const user2 = {
      providerId: provider1.id,
      identityId: 'user2' as IdentityId,
    };
    const user3 = {
      providerId: provider2.id,
      identityId: 'user3' as IdentityId,
    };
    provider1.users['user1'] = user1;
    provider1.users['user2'] = user2;
    provider2.users['user3'] = user3;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      user1.providerId,
      user1.identityId,
      providerToken,
    );
    await identitiesManager.putToken(
      user2.providerId,
      user2.identityId,
      providerToken,
    );
    await identitiesManager.putToken(
      user3.providerId,
      user3.identityId,
      providerToken,
    );
    const response = await rpcClient.methods.identitiesAuthenticatedGet({});
    const output = Array<ClientRPCResponseResult<IdentityMessage>>();
    for await (const providerMessage of response) {
      output.push(providerMessage);
    }
    expect(output).toHaveLength(3);
    expect(output[0]).toEqual(user1);
    expect(output[1]).toEqual(user2);
    expect(output[2]).toEqual(user3);
  });
  test('gets authenticated identities a specific provider', async () => {
    // Setup providers
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
    };
    const user2 = {
      providerId: provider1.id,
      identityId: 'user2' as IdentityId,
    };
    const user3 = {
      providerId: provider2.id,
      identityId: 'user3' as IdentityId,
    };
    provider1.users['user1'] = user1;
    provider1.users['user2'] = user2;
    provider2.users['user3'] = user3;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      user1.providerId,
      user1.identityId,
      providerToken,
    );
    await identitiesManager.putToken(
      user2.providerId,
      user2.identityId,
      providerToken,
    );
    await identitiesManager.putToken(
      user3.providerId,
      user3.identityId,
      providerToken,
    );
    const response = await rpcClient.methods.identitiesAuthenticatedGet({
      providerId: provider2.id,
    });
    const output = Array<ClientRPCResponseResult<IdentityMessage>>();
    for await (const providerMessage of response) {
      output.push(providerMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual(user3);
  });
});
describe('identitiesClaim', () => {
  const logger = new Logger('identitiesClaim test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    identitiesClaim: typeof identitiesClaim;
  }>;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;
  let mockedAddClaim: jest.SpyInstance;
  let testProvider: TestProvider;
  let sigchain: Sigchain;
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    providerToken: {
      accessToken: 'abc123',
    },
  };
  const issNodeKeypair = keysUtils.generateKeyPair();
  const issNodeId = keysUtils.publicKeyToNodeId(issNodeKeypair.publicKey);
  const claimId = claimsUtils.createClaimIdGenerator(issNodeId)();
  const dummyClaim: ClaimLinkIdentity = {
    typ: 'ClaimLinkIdentity',
    iss: nodesUtils.encodeNodeId(issNodeId),
    sub: encodeProviderIdentityId([testToken.providerId, testToken.identityId]),
    jti: claimsUtils.encodeClaimId(claimId),
    iat: 0,
    nbf: 0,
    exp: 0,
    aud: '',
    seq: 0,
    prevClaimId: null,
    prevDigest: null,
  };
  const token = Token.fromPayload(dummyClaim);
  token.signWithPrivateKey(issNodeKeypair);
  const signedClaim = token.toSigned();

  beforeEach(async () => {
    mockedAddClaim = jest
      .spyOn(Sigchain.prototype, 'addClaim')
      .mockImplementation(async (payload, _, func) => {
        const token = Token.fromPayload(payload);
        // We need to call the function to resolve a promise in the code
        func != null && (await func(token as unknown as Token<Claim>));
        return [claimId, signedClaim];
      });

    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {
        linkNodeAndIdentity: jest.fn(),
      } as unknown as GestaltGraph,
      keyRing,
      sigchain,
      logger,
    });
    testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    // Setup
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        identitiesClaim: new IdentitiesClaim({
          identitiesManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        identitiesClaim,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await sigchain.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedAddClaim.mockRestore();
  });
  test('claims identity', async () => {
    // Setup provider
    // Need an authenticated identity
    await identitiesManager.putToken(
      testToken.providerId,
      testToken.identityId,
      testToken.providerToken,
    );
    const request = {
      providerId: testToken.providerId,
      identityId: testToken.identityId,
    };
    const response = await rpcClient.methods.identitiesClaim(request);
    expect(response.claimId).toBe('0');
    expect(response.url).toBe('test.com');
  });
  test('cannot claim invalid identity', async () => {
    // Setup provider
    await testUtils.expectRemoteError(
      rpcClient.methods.identitiesClaim({
        providerId: testToken.providerId,
        identityId: '',
      }),
      validationErrors.ErrorValidation,
    );
    await testUtils.expectRemoteError(
      rpcClient.methods.identitiesClaim({
        providerId: '',
        identityId: testToken.identityId,
      }),
      validationErrors.ErrorValidation,
    );
    await testUtils.expectRemoteError(
      rpcClient.methods.identitiesClaim({
        providerId: '',
        identityId: '',
      }),
      validationErrors.ErrorValidation,
    );
  });
});
describe('identitiesInfoConnectedGet', () => {
  const logger = new Logger('identitiesInfoConnectedGet test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    identitiesInfoConnectedGet: typeof identitiesInfoConnectedGet;
  }>;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;
  const testToken = {
    identityId: 'test_user' as IdentityId,
    providerToken: {
      accessToken: 'abc123',
    },
  };
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGet({
          identitiesManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        identitiesInfoConnectedGet,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets connected identities from a single provider', async () => {
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider.users['user1'] = user1;
    const user2 = {
      providerId: provider.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider.users['user2'] = user2;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      provider.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      providerIdList: [provider.id],
      identityId: '',
      disconnected: false,
      searchTermList: [],
    });
    const output = Array<ClientRPCResponseResult<IdentityInfoMessage>>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
    expect(output[1]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('gets connected identities to a particular identity id', async () => {
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider.users['user1'] = user1;
    const user2 = {
      providerId: provider.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider.users['user2'] = user2;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      provider.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider.users[testToken.identityId].connected = [user1.identityId];
    await identitiesManager.putToken(
      provider.id,
      'otherAuthenticatedId' as IdentityId,
      testToken.providerToken,
    );
    provider.users['otherAuthenticatedId'] = { connected: [user2.identityId] };
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      authIdentityId: 'otherAuthenticatedId',
      providerIdList: [provider.id],
      identityId: '',
      disconnected: false,
      searchTermList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('gets connected identities from multiple providers', async () => {
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider2.users['user2'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      identityId: '',
      disconnected: false,
      searchTermList: [],
      providerIdList: [provider1.id, provider2.id],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
    expect(output[1]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('gets connected identities from all providers', async () => {
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider2.users['user2'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      providerIdList: [],
      identityId: '',
      disconnected: false,
      searchTermList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
    expect(output[1]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('searches for identities matching a search term', async () => {
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider.users['user1'] = user1;
    const user2 = {
      providerId: provider.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider.users['user2'] = user2;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      provider.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      searchTermList: ['1'],
      identityId: '',
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
  });
  test('searches for identities matching multiple search terms', async () => {
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider.users['user1'] = user1;
    const user2 = {
      providerId: provider.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider.users['user2'] = user2;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      provider.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      searchTermList: ['1', '2'],
      identityId: '',
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
    expect(output[1]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('searches for identities matching a search term across multiple providers', async () => {
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider2.users['user1'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      searchTermList: ['1'],
      identityId: '',
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
    expect(output[1]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('gets no connected identities', async () => {
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider.users['user1'] = user1;
    const user2 = {
      providerId: provider.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider.users['user2'] = user2;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      provider.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      limit: 0,
      identityId: '',
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(0);
  });
  test('gets one connected identity', async () => {
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider2.users['user2'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      limit: 1,
      identityId: '',
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
  });
  test('cannot get more identities than available', async () => {
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider2.users['user2'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      limit: 3,
      identityId: '',
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
    expect(output[1]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('can only get from authenticated providers', async () => {
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider2.users['user2'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      identityId: '',
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
  });
  test('gets disconnected identities', async () => {
    // This feature is not implemented yet - should throw error
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      disconnected: true,
      identityId: '',
      providerIdList: [],
    });
    const reader = response.getReader();
    await testUtils.expectRemoteError(
      reader.read(),
      identitiesErrors.ErrorProviderUnimplemented,
    );
  });
});
describe('identitiesInfoGet', () => {
  const logger = new Logger('identitiesInfoGet test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    identitiesInfoGet: typeof identitiesInfoGet;
  }>;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;
  const testToken = {
    identityId: 'test_user' as IdentityId,
    providerToken: {
      accessToken: 'abc123',
    },
  };
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        identitiesInfoGet: new IdentitiesInfoGet({
          identitiesManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        identitiesInfoGet,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets an identity', async () => {
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider.users['user1'] = user1;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      provider.id,
      testToken.identityId,
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: user1.identityId,
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
  });
  test('searches for a handle across providers', async () => {
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider2.users['user1'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
    expect(output[1]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('searches for identities matching a search term', async () => {
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'abc',
      email: 'abc@test.com',
      url: 'provider1.com/user1',
    };
    provider1.users['user1'] = user1;
    provider2.users['user1'] = {
      providerId: provider2.id,
      identityId: 'user1' as IdentityId,
      name: 'def',
      email: 'def@test.com',
      url: 'provider2.com/user1',
    };
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      searchTermList: ['abc'],
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
  });
  test('gets no connected identities', async () => {
    const provider = new TestProvider();
    provider.users['user1'] = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider.users['user2'] = {
      providerId: provider.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      provider.id,
      testToken.identityId,
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      limit: 0,
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(0);
  });
  test('gets one connected identity', async () => {
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    provider2.users['user1'] = {
      providerId: provider2.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      limit: 1,
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
  });
  test('cannot get more identities than available', async () => {
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider2.users['user1'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      limit: 3,
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
    expect(output[1]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('can only get from authenticated providers', async () => {
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    provider2.users['user1'] = {
      providerId: provider2.id,
      identityId: 'user1' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
  });
});
describe('identitiesInvite', () => {
  const logger = new Logger('identitiesInvite test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    identitiesInvite: typeof identitiesInvite;
  }>;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;
  let mockedAddClaim: jest.SpyInstance;
  let testProvider: TestProvider;
  let sigchain: Sigchain;
  let acl: ACL;
  let notificationsManager: NotificationsManager;
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    providerToken: {
      accessToken: 'abc123',
    },
  };
  const issNodeKeypair = keysUtils.generateKeyPair();
  const issNodeId = keysUtils.publicKeyToNodeId(issNodeKeypair.publicKey);
  const claimId = claimsUtils.createClaimIdGenerator(issNodeId)();
  const dummyClaim: ClaimLinkIdentity = {
    typ: 'ClaimLinkIdentity',
    iss: nodesUtils.encodeNodeId(issNodeId),
    sub: encodeProviderIdentityId([testToken.providerId, testToken.identityId]),
    jti: claimsUtils.encodeClaimId(claimId),
    iat: 0,
    nbf: 0,
    exp: 0,
    aud: '',
    seq: 0,
    prevClaimId: null,
    prevDigest: null,
  };
  const token = Token.fromPayload(dummyClaim);
  token.signWithPrivateKey(issNodeKeypair);
  const signedClaim = token.toSigned();
  beforeEach(async () => {
    mockedAddClaim = jest
      .spyOn(Sigchain.prototype, 'addClaim')
      .mockImplementation(async (payload, _, func) => {
        const token = Token.fromPayload(payload);
        // We need to call the function to resolve a promise in the code
        func != null && (await func(token as unknown as Token<Claim>));
        return [claimId, signedClaim];
      });

    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {
        linkNodeAndIdentity: jest.fn(),
      } as unknown as GestaltGraph,
      keyRing,
      sigchain,
      logger,
    });
    testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    acl = {
      setNodeAction: jest.fn(),
    } as unknown as ACL;
    notificationsManager = {
      sendNotification: jest.fn(),
    } as unknown as NotificationsManager;
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        identitiesInvite: new IdentitiesInvite({
          acl: acl as unknown as ACL,
          notificationsManager:
            notificationsManager as unknown as NotificationsManager,
          logger,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        identitiesInvite,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await sigchain.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedAddClaim.mockRestore();
  });
  test('Invite a node', async () => {
    const nodeId = testsUtils.generateRandomNodeId();
    await rpcClient.methods.identitiesInvite({
      nodeIdEncoded: nodesUtils.encodeNodeId(nodeId),
    });
    expect(acl.setNodeAction).toHaveBeenCalledWith(nodeId, 'claim');
    expect(notificationsManager.sendNotification).toHaveBeenCalledWith(nodeId, {
      type: 'GestaltInvite',
    });
  });
});
describe('identitiesProvidersList', () => {
  const logger = new Logger('identitiesProvidersList test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    identitiesProvidersList: typeof identitiesProvidersList;
  }>;
  let identitiesManager: IdentitiesManager;
  const id1 = 'provider1' as ProviderId;
  const id2 = 'provider2' as ProviderId;
  const providers = {};
  providers[id1] = new TestProvider();
  providers[id2] = new TestProvider();
  let mockedGetProviders: jest.SpyInstance;
  beforeEach(async () => {
    mockedGetProviders = jest
      .spyOn(IdentitiesManager.prototype, 'getProviders')
      .mockReturnValue(providers);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        identitiesProvidersList: new IdentitiesProvidersList({
          identitiesManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        identitiesProvidersList,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedGetProviders.mockRestore();
  });
  test('identitiesProvidersList', async () => {
    const response = await rpcClient.methods.identitiesProvidersList({});
    expect(response.providerIds).toContain('provider1');
    expect(response.providerIds).toContain('provider2');
  });
});
describe('identitiesTokenPutDeleteGet', () => {
  const logger = new Logger('identitiesTokenPutDeleteGet test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;

  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    identitiesTokenPut: typeof identitiesTokenPut;
    identitiesTokenDelete: typeof identitiesTokenDelete;
    identitiesTokenGet: typeof identitiesTokenGet;
  }>;
  let identitiesManager: IdentitiesManager;
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    providerToken: {
      accessToken: 'abc123',
    },
  };
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        identitiesTokenPut: new IdentitiesTokenPut({
          identitiesManager,
          db,
        }),
        identitiesTokenDelete: new IdentitiesTokenDelete({
          db,
          identitiesManager,
        }),
        identitiesTokenGet: new IdentitiesTokenGet({
          db,
          identitiesManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        identitiesTokenPut,
        identitiesTokenDelete,
        identitiesTokenGet,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('puts/deletes/gets tokens', async () => {
    // Put token
    const providerMessage = {
      providerId: testToken.providerId,
      identityId: testToken.identityId,
    };
    await rpcClient.methods.identitiesTokenPut({
      ...providerMessage,
      token: testToken.providerToken,
    });
    // Get token
    const getPutResponse =
      await rpcClient.methods.identitiesTokenGet(providerMessage);
    expect(getPutResponse.token).toStrictEqual(testToken.providerToken);
    // Delete token
    await rpcClient.methods.identitiesTokenDelete(providerMessage);
    // Check token was deleted
    const getDeleteResponse =
      await rpcClient.methods.identitiesTokenGet(providerMessage);
    expect(getDeleteResponse.token).toBeUndefined();
  });
});
