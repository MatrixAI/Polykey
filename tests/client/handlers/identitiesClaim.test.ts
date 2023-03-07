import type { TLSConfig } from '@/network/types';
import type { IdentityId, ProviderId } from '@/ids/index';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { Claim } from '@/claims/types';
import type { ClaimLinkIdentity } from '@/claims/payloads';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/RPC/RPCServer';
import {
  identitiesClaim,
  IdentitiesClaimHandler,
} from '@/client/handlers/identitiesClaim';
import RPCClient from '@/RPC/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import IdentitiesManager from '@/identities/IdentitiesManager';
import * as nodesUtils from '@/nodes/utils';
import { encodeProviderIdentityId } from '@/ids/index';
import * as claimsUtils from '@/claims/utils';
import * as validationErrors from '@/validation/errors';
import * as testsUtils from '../../utils';
import TestProvider from '../../identities/TestProvider';
import Token from '../../../src/tokens/Token';
import * as testUtils from '../../utils';
import Sigchain from '../../../src/sigchain/Sigchain';

describe('identitiesClaim', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
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
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
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
  });
  afterEach(async () => {
    await webSocketServer.stop(true);
    await webSocketClient.destroy(true);
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
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesClaim: new IdentitiesClaimHandler({
          identitiesManager,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesClaim,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesClaim: new IdentitiesClaimHandler({
          identitiesManager,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesClaim,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
