import type { Key } from '@/keys/types';
import type { ClaimId, SignedClaim } from '@/claims/types';
import type { ClaimInput } from '@/sigchain/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { testProp, fc } from '@fast-check/jest';
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';
import 'ix/add/asynciterable-operators/toarray';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import Sigchain from '@/sigchain/Sigchain';
import Token from '@/tokens/Token';
import * as sigchainErrors from '@/sigchain/errors';
import * as keysUtils from '@/keys/utils';
import * as claimsUtils from '@/claims/utils';
import * as utils from '@/utils';

describe(Sigchain.name, () => {
  const password = keysUtils.getRandomBytes(10).toString('utf-8');
  const privateKey = keysUtils.generateKeyPair().privateKey;
  const logger = new Logger(`${Sigchain.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let dbPath: string;
  let db: DB;
  let keyRing: KeyRing;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      privateKey,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              Buffer.from(key) as Key,
              Buffer.from(plainText),
            ).buffer;
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              Buffer.from(key) as Key,
              Buffer.from(cipherText),
            )?.buffer;
          },
        },
      },
    });
  });
  afterEach(async () => {
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('Sigchain readiness', async () => {
    const sigchain = await Sigchain.createSigchain({ keyRing, db, logger });
    await expect(async () => {
      await sigchain.destroy();
    }).rejects.toThrow(sigchainErrors.ErrorSigchainRunning);
    // Should be a noop
    await sigchain.start();
    await sigchain.stop();
    await sigchain.destroy();
    await expect(sigchain.start()).rejects.toThrow(
      sigchainErrors.ErrorSigchainDestroyed,
    );
    await expect(async () => {
      for await (const _ of sigchain.getClaims()) {
        // NOOP
      }
    }).rejects.toThrow(sigchainErrors.ErrorSigchainNotRunning);
  });
  testProp(
    'claims must have claim default properties',
    [fc.array(fc.object(), { minLength: 1, maxLength: 32 })],
    async (datas) => {
      const sigchain = await Sigchain.createSigchain({
        keyRing,
        db,
        logger,
        fresh: true,
      });
      const now = new Date();
      for (const data of datas) {
        // Force adding properties that will be overridden
        const [claimId, signedClaim] = await sigchain.addClaim(
          {
            ...data,
            jti: 12345,
            iat: '111111',
            nbf: '111111',
            seq: 'random',
            prevClaimId: 12345,
            prevDigest: 55555,
          } as unknown as ClaimInput,
          now,
        );
        // Other properties may exist, but these must always exist
        expect(signedClaim.payload).toMatchObject({
          jti: claimsUtils.encodeClaimId(claimId),
          iat: utils.getUnixtime(now),
          nbf: utils.getUnixtime(now),
          prevClaimId: expect.toBeOneOf([null, expect.any(String)]),
          prevDigest: expect.toBeOneOf([null, expect.any(String)]),
          seq: expect.any(Number),
        });
      }
      await sigchain.stop();
    },
  );
  testProp(
    'claim sequence number is monotonic',
    [fc.array(fc.object(), { minLength: 1, maxLength: 32 })],
    async (datas) => {
      const sigchain = await Sigchain.createSigchain({
        keyRing,
        db,
        logger,
        fresh: true,
      });
      let seq = 0;
      for (const data of datas) {
        const [, signedClaim] = await sigchain.addClaim(data as ClaimInput);
        seq++;
        expect(signedClaim.payload.seq).toBe(seq);
      }
      await sigchain.stop();
    },
  );
  testProp(
    'adding claims is serialised',
    [fc.scheduler(), fc.array(fc.object(), { minLength: 1, maxLength: 32 })],
    async (s, datas) => {
      const sigchain = await Sigchain.createSigchain({
        keyRing,
        db,
        logger,
        fresh: true,
      });
      // Build up concurrent calls to add claim
      const addClaimPs: Array<Promise<[ClaimId, SignedClaim]>> = [];
      for (const data of datas) {
        addClaimPs.push(
          // Delay the `Sigchain.addClaim` call
          s
            .schedule(Promise.resolve())
            .then(() => sigchain.addClaim(data as ClaimInput)),
        );
      }
      // Scheduler will randomly call add claim
      await s.waitAll();
      // All add claim operations should be serialised
      const results = await Promise.allSettled(addClaimPs);
      for (const result of results) {
        expect(result.status).toBe('fulfilled');
      }
      // Get all chain of claims in descending order
      const signedClaims = await AsyncIterable.as(
        sigchain.getSignedClaims({
          order: 'desc',
        }),
      ).toArray();
      expect(signedClaims.length).toBe(datas.length);
      let digest: string | null = null;
      for (const [, signedClaim] of signedClaims) {
        if (digest != null) {
          const currentDigest = claimsUtils.hashSignedClaim(
            signedClaim,
            'blake2b-256',
          );
          const currentDigestEncoded = claimsUtils.encodeSignedClaimDigest(
            currentDigest,
            'blake2b-256',
          );
          expect(currentDigestEncoded).toBe(digest);
        }
        digest = signedClaim.payload.prevDigest;
      }
      await sigchain.stop();
    },
  );
  testProp(
    'claims are all signed by the current node',
    [fc.array(fc.object(), { minLength: 1, maxLength: 32 })],
    async (datas) => {
      const sigchain = await Sigchain.createSigchain({
        keyRing,
        db,
        logger,
        fresh: true,
      });
      for (const data of datas) {
        const [, signedClaim] = await sigchain.addClaim(data as ClaimInput);
        const token = Token.fromSigned(signedClaim);
        expect(token.verifyWithPublicKey(keyRing.keyPair.publicKey)).toBe(true);
      }
      await sigchain.stop();
    },
  );
  testProp(
    'claims form a hash chain',
    [fc.array(fc.object(), { minLength: 1, maxLength: 32 })],
    async (datas) => {
      const sigchain = await Sigchain.createSigchain({
        keyRing,
        db,
        logger,
        fresh: true,
      });
      const claimIdSignedClaims: Array<[ClaimId, SignedClaim]> = [];
      for (const [index, data] of datas.entries()) {
        const claimIdSignedClaim = await sigchain.addClaim(data as ClaimInput);
        if (claimIdSignedClaims.length > 0) {
          const prevDigest = claimsUtils.hashSignedClaim(
            claimIdSignedClaims[index - 1][1],
            'blake2b-256',
          );
          const prevDigestEncoded = claimsUtils.encodeSignedClaimDigest(
            prevDigest,
            'blake2b-256',
          );
          expect(claimIdSignedClaim[1].payload.prevDigest).toBe(
            prevDigestEncoded,
          );
        } else {
          expect(claimIdSignedClaim[1].payload.prevDigest).toBeNull();
        }
        claimIdSignedClaims.push(claimIdSignedClaim);
      }
      await sigchain.stop();
    },
  );
  testProp(
    'get claim(s), get signed claim(s) and get signatures',
    [fc.array(fc.object(), { minLength: 1, maxLength: 32 })],
    async (datas) => {
      const sigchain = await Sigchain.createSigchain({
        keyRing,
        db,
        logger,
        fresh: true,
      });
      const claimIdSignedClaims: Array<[ClaimId, SignedClaim]> = [];
      for (const data of datas) {
        const claimIdSignedClaim = await sigchain.addClaim(data as ClaimInput);
        claimIdSignedClaims.push(claimIdSignedClaim);
      }
      for (const [claimId, signedClaim] of claimIdSignedClaims) {
        const claim_ = await sigchain.getClaim(claimId);
        expect(claim_).toEqual(signedClaim.payload);
        const signedClaim_ = await sigchain.getSignedClaim(claimId);
        expect(signedClaim_).toEqual(signedClaim);
        const signatures = await sigchain.getSignatures(claimId);
        expect(signatures).toEqual(signedClaim.signatures);
      }
      const signedClaims = await AsyncIterable.as(
        sigchain.getSignedClaims(),
      ).toArray();
      expect(signedClaims).toEqual(claimIdSignedClaims);
      const claims = await AsyncIterable.as(sigchain.getClaims()).toArray();
      expect(claims).toEqual(
        claimIdSignedClaims.map((c) => [c[0], c[1].payload]),
      );
      await sigchain.stop();
    },
  );
  testProp(
    'get last claim, get last signed claim, get last claim ID, get last sequence',
    [fc.array(fc.object(), { minLength: 1, maxLength: 32 })],
    async (datas) => {
      const sigchain = await Sigchain.createSigchain({
        keyRing,
        db,
        logger,
        fresh: true,
      });
      const claimIdSignedClaims: Array<[ClaimId, SignedClaim]> = [];
      for (const data of datas) {
        const claimIdSignedClaim = await sigchain.addClaim(data as ClaimInput);
        claimIdSignedClaims.push(claimIdSignedClaim);
      }
      const lastClaimIdSignedClaims =
        claimIdSignedClaims[claimIdSignedClaims.length - 1];
      const lastClaimId = await sigchain.getLastClaimId();
      expect(lastClaimId).toEqual(lastClaimIdSignedClaims[0]);
      const lastSequenceNumber = await sigchain.getLastSequenceNumber();
      expect(lastSequenceNumber).toEqual(
        lastClaimIdSignedClaims[1].payload.seq,
      );
      const lastClaim = await sigchain.getLastClaim();
      expect(lastClaim).toEqual([
        lastClaimIdSignedClaims[0],
        lastClaimIdSignedClaims[1].payload,
      ]);
      const lastSignedClaim = await sigchain.getLastSignedClaim();
      expect(lastSignedClaim).toEqual(lastClaimIdSignedClaims);
      await sigchain.stop();
    },
  );
  test('getClaims with seek ascending', async () => {
    const sigchain = await Sigchain.createSigchain({
      keyRing,
      db,
      logger,
      fresh: true,
    });
    const claims: Array<[ClaimId, SignedClaim]> = [];
    for (let i = 0; i < 3; i++) {
      claims.push(await sigchain.addClaim({}));
    }
    const claimsAsc = await AsyncIterable.as(
      sigchain.getClaims({ seek: claims[1][0], order: 'asc' }),
    ).toArray();
    expect(claimsAsc).toHaveLength(2);
    // The claim we seeked to is included
    expect(claimsAsc[0][0].equals(claims[1][0])).toBeTrue();
    // And the claim after
    expect(claimsAsc[1][0].equals(claims[2][0])).toBeTrue();
  });
  test('getClaims with seek descending', async () => {
    const sigchain = await Sigchain.createSigchain({
      keyRing,
      db,
      logger,
      fresh: true,
    });
    const claims: Array<[ClaimId, SignedClaim]> = [];
    for (let i = 0; i < 3; i++) {
      claims.push(await sigchain.addClaim({}));
    }
    const claimsAsc = await AsyncIterable.as(
      sigchain.getClaims({ seek: claims[1][0], order: 'desc' }),
    ).toArray();
    expect(claimsAsc).toHaveLength(2);
    // The claim we seeked to is included
    expect(claimsAsc[0][0].equals(claims[1][0])).toBeTrue();
    // And the claim after
    expect(claimsAsc[1][0].equals(claims[0][0])).toBeTrue();
  });
  test('getClaims with seek with limit', async () => {
    const sigchain = await Sigchain.createSigchain({
      keyRing,
      db,
      logger,
      fresh: true,
    });
    const claims: Array<[ClaimId, SignedClaim]> = [];
    for (let i = 0; i < 3; i++) {
      claims.push(await sigchain.addClaim({}));
    }
    const claimsAsc = await AsyncIterable.as(
      sigchain.getClaims({ seek: claims[1][0], limit: 1 }),
    ).toArray();
    expect(claimsAsc).toHaveLength(1);
    // The claim we seeked to is included
    expect(claimsAsc[0][0].equals(claims[1][0])).toBeTrue();
  });
});
