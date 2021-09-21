import type {
  ProviderId,
  IdentityId,
  TokenData,
  IdentityData,
} from '@/identities/types';
import type { NodeId } from '@/nodes/types';
import type { Claim, ClaimData, SignatureData } from '@/claims/types';
import type { IdentityClaim } from '@/identities/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { KeyManager } from '@/keys';
import { DB } from '@/db';
import { IdentitiesManager, providers } from '@/identities';
import * as identitiesErrors from '@/identities/errors';
import TestProvider from './TestProvider';

describe('IdentitiesManager', () => {
  const logger = new Logger('IdentitiesManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let keyManager: KeyManager;
  let db: DB;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = await KeyManager.createKeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({ dbPath, logger });
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
  });
  afterEach(async () => {
    await db.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('get, set and unset tokens', async () => {
    const identitiesManager = new IdentitiesManager({
      db,
      logger,
    });
    await identitiesManager.start();
    const providerId = 'test-provider' as ProviderId;
    const identityId = 'test-user' as IdentityId;
    const tokenData = {
      accessToken: 'abc',
    };
    await identitiesManager.putToken(providerId, identityId, tokenData);
    const tokenData_ = await identitiesManager.getToken(providerId, identityId);
    expect(tokenData).toStrictEqual(tokenData_);
    await identitiesManager.delToken(providerId, identityId);
    await identitiesManager.delToken(providerId, identityId);
    const tokenData__ = await identitiesManager.getToken(
      providerId,
      identityId,
    );
    expect(tokenData__).toBeUndefined();
    await identitiesManager.stop();
  });
  test('start and stop preserves state', async () => {
    const identitiesManager = new IdentitiesManager({
      db,
      logger,
    });
    await identitiesManager.start();
    const providerId = 'test-provider' as ProviderId;
    const identityId = 'test-user' as IdentityId;
    const tokenData = {
      accessToken: 'abc',
    };
    await identitiesManager.putToken(providerId, identityId, tokenData);
    const testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
    await identitiesManager.stop();
    await identitiesManager.start();
    const tokenData_ = await identitiesManager.getToken(providerId, identityId);
    expect(tokenData).toStrictEqual(tokenData_);
    expect(identitiesManager.getProviders()).toStrictEqual({
      [testProvider.id]: testProvider,
    });
    await identitiesManager.stop();
  });
  test('fresh start deletes all state', async () => {
    const identitiesManager = new IdentitiesManager({
      db,
      logger,
    });
    await identitiesManager.start();
    const providerId = 'test-provider' as ProviderId;
    const identityId = 'test-user' as IdentityId;
    const tokenData = {
      accessToken: 'abc',
    };
    await identitiesManager.putToken(providerId, identityId, tokenData);
    const testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
    await identitiesManager.stop();
    await identitiesManager.start({ fresh: true });
    const tokenData_ = await identitiesManager.getToken(providerId, identityId);
    expect(tokenData_).toBeUndefined();
    expect(identitiesManager.getProviders()).toStrictEqual({});
    await identitiesManager.stop();
  });
  test('register and unregister providers', async () => {
    const identitiesManager = new IdentitiesManager({
      db,
      logger,
    });
    await identitiesManager.start();
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
  test('using TestProvider', async () => {
    const identitiesManager = new IdentitiesManager({
      db,
      logger,
    });
    await identitiesManager.start();
    const testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
    // we are going to run authenticate
    const authProcess = testProvider.authenticate();
    const result1 = await authProcess.next();
    // the test provider will provider a dummy authcode
    expect(result1.value).toBeDefined();
    expect(typeof result1.value).toBe('string');
    expect(result1.done).toBe(false);
    // this is when we have completed it
    const result2 = await authProcess.next();
    expect(result2.value).toBeDefined();
    expect(result2.done).toBe(true);
    const identityId = result2.value as IdentityId;
    const tokenData = (await testProvider.getToken(identityId)) as TokenData;
    expect(tokenData).toBeDefined();
    const identityId_ = await testProvider.getIdentityId(tokenData);
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
    const identityDatas: Array<IdentityData> = [];
    for await (const identityData_ of testProvider.getConnectedIdentityDatas(
      identityId,
    )) {
      identityDatas.push(identityData_);
    }
    expect(identityDatas).toHaveLength(1);
    expect(identityDatas).not.toContainEqual(identityData);
    // Now publish a claim
    const signatures: Record<NodeId, SignatureData> = {};
    signatures['somenode' as NodeId] = {
      signature: 'examplesignature',
      header: {
        alg: 'RS256',
        kid: 'somenode' as NodeId,
      },
    };
    const rawClaim: Claim = {
      payload: {
        hPrev: null,
        seq: 1,
        iat: Math.floor(Date.now() / 1000),
        data: {
          type: 'identity',
          node: 'somenode' as NodeId,
          provider: testProvider.id,
          identity: identityId,
        } as ClaimData,
      },
      signatures: signatures,
    };
    const publishedClaim = await testProvider.publishClaim(
      identityId,
      rawClaim,
    );
    expect(publishedClaim).toBeDefined();
    // publishedClaim will contain 2 extra metadata fields: URL and id
    expect(publishedClaim).toMatchObject(rawClaim);
    const publishedClaim_ = await testProvider.getClaim(
      identityId,
      publishedClaim.id,
    );
    expect(publishedClaim).toStrictEqual(publishedClaim_);
    const publishedClaims: Array<IdentityClaim> = [];
    for await (const claim of testProvider.getClaims(identityId, identityId)) {
      publishedClaims.push(claim);
    }
    expect(publishedClaims).toContainEqual(publishedClaim);
    await identitiesManager.stop();
  });
});
