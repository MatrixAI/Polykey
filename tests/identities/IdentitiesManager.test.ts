import type {
  ProviderId,
  IdentityId,
  ProviderToken,
  IdentityData,
  IdentitySignedClaim,
} from '@/identities/types';
import type { Key } from '@/keys/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { ClaimLinkIdentity } from '@/claims/payloads';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { testProp } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { IdentitiesManager, providers } from '@/identities';
import * as identitiesErrors from '@/identities/errors';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as utils from '@/utils';
import KeyRing from '@/keys/KeyRing';
import Sigchain from '@/sigchain/Sigchain';
import { encodeProviderIdentityId } from '@/ids';
import Token from '@/tokens/Token';
import * as identitiesTestUtils from './utils';
import TestProvider from './TestProvider';
import * as claimsTestUtils from '../claims/utils';
import * as keysTestUtils from '../keys/utils';
import * as testNodesUtils from '../nodes/utils';

describe('IdentitiesManager', () => {
  const logger = new Logger('IdentitiesManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const dummyKeyRing = {} as KeyRing;
  const dummySigchain = {} as Sigchain;
  const dummyGestaltGraph = {} as GestaltGraph;
  let dataDir: string;
  let db: DB;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keysUtils.generateKey(),
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
    });
  });
  afterEach(async () => {
    await db.stop();
    await db.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('IdentitiesManager readiness', async () => {
    const identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      keyRing: dummyKeyRing,
      gestaltGraph: dummyGestaltGraph,
      sigchain: dummySigchain,
      logger,
    });
    await expect(async () => {
      await identitiesManager.destroy();
    }).rejects.toThrow(identitiesErrors.ErrorIdentitiesManagerRunning);
    // Should be a noop
    await identitiesManager.start();
    await identitiesManager.stop();
    await identitiesManager.destroy();
    await expect(async () => {
      await identitiesManager.start();
    }).rejects.toThrow(identitiesErrors.ErrorIdentitiesManagerDestroyed);
    expect(() => {
      identitiesManager.getProviders();
    }).toThrow(identitiesErrors.ErrorIdentitiesManagerNotRunning);
    await expect(async () => {
      await identitiesManager.getTokens('abc' as ProviderId);
    }).rejects.toThrow(identitiesErrors.ErrorIdentitiesManagerNotRunning);
  });
  testProp(
    'get, set and unset tokens',
    [identitiesTestUtils.identitiyIdArb, identitiesTestUtils.providerTokenArb],
    async (identityId, providerToken) => {
      const identitiesManager = await IdentitiesManager.createIdentitiesManager(
        {
          db,
          keyRing: dummyKeyRing,
          gestaltGraph: dummyGestaltGraph,
          sigchain: dummySigchain,
          logger,
          fresh: true,
        },
      );
      const providerId = 'test-provider' as ProviderId;
      await identitiesManager.putToken(providerId, identityId, providerToken);
      const providerToken_ = await identitiesManager.getToken(
        providerId,
        identityId,
      );
      expect(providerToken).toStrictEqual(providerToken_);
      await identitiesManager.delToken(providerId, identityId);
      await identitiesManager.delToken(providerId, identityId);
      const providerToken__ = await identitiesManager.getToken(
        providerId,
        identityId,
      );
      expect(providerToken__).toBeUndefined();
      await identitiesManager.stop();
    },
  );
  testProp(
    'start and stop preserves state',
    [identitiesTestUtils.identitiyIdArb, identitiesTestUtils.providerTokenArb],
    async (identityId, providerToken) => {
      let identitiesManager = await IdentitiesManager.createIdentitiesManager({
        db,
        keyRing: dummyKeyRing,
        gestaltGraph: dummyGestaltGraph,
        sigchain: dummySigchain,
        logger,
        fresh: true,
      });
      const providerId = 'test-provider' as ProviderId;
      await identitiesManager.putToken(providerId, identityId, providerToken);
      const testProvider = new TestProvider();
      identitiesManager.registerProvider(testProvider);
      await identitiesManager.stop();

      identitiesManager = await IdentitiesManager.createIdentitiesManager({
        db,
        keyRing: dummyKeyRing,
        gestaltGraph: dummyGestaltGraph,
        sigchain: dummySigchain,
        logger,
      });
      identitiesManager.registerProvider(testProvider);
      const providerToken_ = await identitiesManager.getToken(
        providerId,
        identityId,
      );
      expect(providerToken).toStrictEqual(providerToken_);
      expect(identitiesManager.getProviders()).toStrictEqual({
        [testProvider.id]: testProvider,
      });
      await identitiesManager.stop();
    },
  );
  testProp(
    'fresh start deletes all state',
    [identitiesTestUtils.identitiyIdArb, identitiesTestUtils.providerTokenArb],
    async (identityId, providerToken) => {
      let identitiesManager = await IdentitiesManager.createIdentitiesManager({
        db,
        keyRing: dummyKeyRing,
        gestaltGraph: dummyGestaltGraph,
        sigchain: dummySigchain,
        logger,
        fresh: true,
      });
      const providerId = 'test-provider' as ProviderId;
      await identitiesManager.putToken(providerId, identityId, providerToken);
      const testProvider = new TestProvider();
      identitiesManager.registerProvider(testProvider);
      await identitiesManager.stop();

      identitiesManager = await IdentitiesManager.createIdentitiesManager({
        db,
        keyRing: dummyKeyRing,
        gestaltGraph: dummyGestaltGraph,
        sigchain: dummySigchain,
        logger,
        fresh: true,
      });
      const providerToken_ = await identitiesManager.getToken(
        providerId,
        identityId,
      );
      expect(providerToken_).toBeUndefined();
      expect(identitiesManager.getProviders()).toStrictEqual({});
      await identitiesManager.stop();
    },
  );
  test('register and unregister providers', async () => {
    const identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      keyRing: dummyKeyRing,
      gestaltGraph: dummyGestaltGraph,
      sigchain: dummySigchain,
      logger,
    });
    const testProvider = new TestProvider();
    const githubProvider = new providers.GithubProvider({
      clientId: 'randomclientid',
    });
    identitiesManager.registerProvider(testProvider);
    identitiesManager.registerProvider(githubProvider);
    let ps;
    ps = identitiesManager.getProviders();
    expect(ps).toStrictEqual({
      [testProvider.id]: testProvider,
      [githubProvider.id]: githubProvider,
    });
    identitiesManager.unregisterProvider(testProvider.id);
    expect(identitiesManager.getProvider(testProvider.id)).toBeUndefined();
    expect(() => {
      identitiesManager.registerProvider(githubProvider);
    }).toThrow(identitiesErrors.ErrorProviderDuplicate);
    identitiesManager.unregisterProvider(githubProvider.id);
    ps = identitiesManager.getProviders();
    expect(ps).toStrictEqual({});
    await identitiesManager.stop();
  });
  testProp(
    'using TestProvider',
    [claimsTestUtils.claimArb, keysTestUtils.privateKeyArb],
    async (claim, privateKey) => {
      const identitiesManager = await IdentitiesManager.createIdentitiesManager(
        {
          db,
          keyRing: dummyKeyRing,
          gestaltGraph: dummyGestaltGraph,
          sigchain: dummySigchain,
          logger,
          fresh: true,
        },
      );
      const testProvider = new TestProvider();
      identitiesManager.registerProvider(testProvider);
      // We are going to run authenticate
      const authProcess = testProvider.authenticate();
      const result1 = await authProcess.next();
      // The test provider will provider a dummy authcode
      expect(result1.value).toBeDefined();
      expect(typeof result1.value).toBe('object');
      expect(result1.done).toBe(false);
      // This is when we have completed it
      const result2 = await authProcess.next();
      expect(result2.value).toBeDefined();
      expect(result2.done).toBe(true);
      const identityId = result2.value as IdentityId;
      const providerToken = (await testProvider.getToken(
        identityId,
      )) as ProviderToken;
      expect(providerToken).toBeDefined();
      const identityId_ = await testProvider.getIdentityId(providerToken);
      expect(identityId).toBe(identityId_);
      const authIdentityIds = await testProvider.getAuthIdentityIds();
      expect(authIdentityIds).toContain(identityId);
      const identityData = await testProvider.getIdentityData(
        identityId,
        identityId,
      );
      expect(identityData).toBeDefined();
      expect(identityData).toHaveProperty('providerId', testProvider.id);
      expect(identityData).toHaveProperty('identityId', identityId);
      // Give the provider a connected identity to discover
      testProvider.users['some-user'] = {};
      testProvider.users[identityId].connected = ['some-user'];
      const identityDatas: Array<IdentityData> = [];
      for await (const identityData_ of testProvider.getConnectedIdentityDatas(
        identityId,
      )) {
        identityDatas.push(identityData_);
      }
      expect(identityDatas).toHaveLength(1);
      expect(identityDatas).not.toContainEqual(identityData);
      // Now publish a claim
      const nodeIdSome = testNodesUtils.generateRandomNodeId();
      const claimPayload: ClaimLinkIdentity = {
        ...claim,
        typ: 'ClaimLinkIdentity',
        iat: Math.floor(Date.now() / 1000),
        iss: nodesUtils.encodeNodeId(nodeIdSome),
        sub: encodeProviderIdentityId([testProvider.id, identityId]),
        seq: 1,
      };
      const claimToken = Token.fromPayload(claimPayload);
      claimToken.signWithPrivateKey(privateKey);

      const publishedClaim = await testProvider.publishClaim(
        identityId,
        claimToken.toSigned(),
      );
      expect(publishedClaim).toBeDefined();
      // PublishedClaim will contain 2 extra metadata fields: URL and id
      expect(publishedClaim.claim.payload).toMatchObject(claimPayload);
      const publishedClaim_ = await testProvider.getClaim(
        identityId,
        publishedClaim.id,
      );
      expect(publishedClaim).toMatchObject(publishedClaim_!);
      const publishedClaims: Array<IdentitySignedClaim> = [];
      for await (const claim of testProvider.getClaims(
        identityId,
        identityId,
      )) {
        publishedClaims.push(claim);
      }
      expect(publishedClaims).toContainEqual(publishedClaim);
      await identitiesManager.stop();
    },
  );
  testProp(
    'handleClaimIdentity',
    [identitiesTestUtils.identitiyIdArb, identitiesTestUtils.providerTokenArb],
    async (identitiyId, providerToken) => {
      const keyRing = await KeyRing.createKeyRing({
        password: 'password',
        keysPath: path.join(dataDir, 'keys'),
        options: {
          strictMemoryLock: false,
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
        },
        logger,
        fresh: true,
      });
      const sigchain = await Sigchain.createSigchain({
        db,
        keyRing,
        logger,
        fresh: true,
      });
      const mockedLinkNodeAndIdentity = jest.fn();
      const identitiesManager = await IdentitiesManager.createIdentitiesManager(
        {
          db,
          keyRing,
          gestaltGraph: {
            linkNodeAndIdentity: mockedLinkNodeAndIdentity,
          } as unknown as GestaltGraph,
          sigchain,
          logger,
          fresh: true,
        },
      );
      const providerId = 'test-provider' as ProviderId;
      const testProvider = new TestProvider();
      identitiesManager.registerProvider(testProvider);
      await identitiesManager.putToken(providerId, identitiyId, providerToken);
      await identitiesManager.handleClaimIdentity(providerId, identitiyId);
      // Gestalt graph `linkNodeAndIdentity` should've been called
      expect(mockedLinkNodeAndIdentity).toHaveBeenCalled();
    },
    { numRuns: 1 },
  );
});
