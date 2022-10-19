import { testProp, fc } from '@fast-check/jest';
import * as hash from '@/keys/utils/hash';
import * as utils from '@/utils';

describe('keys/utils/hash', () => {
  testProp(
    'sha2-256',
    [fc.uint8Array({ minLength: 0, maxLength: 1024 })],
    (data) => {
      const digest1 = hash.sha2256(data);
      const digest2 = hash.sha2256(data);
      expect(digest1).toHaveLength(32);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha2-512',
    [fc.uint8Array({ minLength: 0, maxLength: 1024 })],
    (data) => {
      const digest1 = hash.sha2512(data);
      const digest2 = hash.sha2512(data);
      expect(digest1).toHaveLength(64);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha2-512-256',
    [fc.uint8Array({ minLength: 0, maxLength: 1024 })],
    (data) => {
      const digest1 = hash.sha2512256(data);
      const digest2 = hash.sha2512256(data);
      expect(digest1).toHaveLength(32);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'blake2b-256',
    [fc.uint8Array({ minLength: 0, maxLength: 1024 })],
    (data) => {
      const digest1 = hash.blake2b256(data);
      const digest2 = hash.blake2b256(data);
      expect(digest1).toHaveLength(32);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha2-256 iterable',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const digest1 = hash.sha2256I(datas);
      const digest2 = hash.sha2256(Buffer.concat(datas));
      expect(digest1).toHaveLength(32);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha2-512 iterable',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const digest1 = hash.sha2512I(datas);
      const digest2 = hash.sha2512(Buffer.concat(datas));
      expect(digest1).toHaveLength(64);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha2-512-256 iterable',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const digest1 = hash.sha2512256I(datas);
      const digest2 = hash.sha2512256(Buffer.concat(datas));
      expect(digest1).toHaveLength(32);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'blake2b-256 iterable',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const digest1 = hash.blake2b256I(datas);
      const digest2 = hash.blake2b256(Buffer.concat(datas));
      expect(digest1).toHaveLength(32);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha2-256 generator',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const hasher = hash.sha2256G();
      hasher.next();
      for (const data of datas) {
        hasher.next(data);
      }
      const result = hasher.next(null);
      const digest1 = result.value;
      expect(result.done).toBe(true);
      expect(digest1).toHaveLength(32);
      const digest2 = hash.sha2256(Buffer.concat(datas));
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha2-512 generator',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const hasher = hash.sha2512G();
      hasher.next();
      for (const data of datas) {
        hasher.next(data);
      }
      const result = hasher.next(null);
      const digest1 = result.value;
      expect(result.done).toBe(true);
      expect(digest1).toHaveLength(64);
      const digest2 = hash.sha2512(Buffer.concat(datas));
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha2-512-256 generator',
    [
      fc.array(
        fc.uint8Array({ minLength: 0, maxLength: 1024 })
      )
    ],
    (datas) => {
      const hasher = hash.sha2512256G();
      hasher.next();
      for (const data of datas) {
        hasher.next(data);
      }
      const result = hasher.next(null);
      const digest1 = result.value;
      expect(result.done).toBe(true);
      expect(digest1).toHaveLength(32);
      const digest2 = hash.sha2512256(Buffer.concat(datas));
      expect(digest1).toStrictEqual(digest2);
    },
    { seed: 1150342642, path: "0:0", endOnFailure: true }
  );
  testProp(
    'blake2b-256 generator',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const hasher = hash.blake2b256G();
      hasher.next();
      for (const data of datas) {
        hasher.next(data);
      }
      const result = hasher.next(null);
      const digest1 = result.value;
      expect(result.done).toBe(true);
      expect(digest1).toHaveLength(32);
      const digest2 = hash.blake2b256(Buffer.concat(datas));
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'hash',
    [fc.uint8Array({ minLength: 0, maxLength: 1024 })],
    (data) => {
      const digestSHA2256 = hash.hash(data, 'sha2-256');
      const digestSHA2512 = hash.hash(data, 'sha2-512');
      const digestSHA2512256 = hash.hash(data, 'sha2-512-256');
      const digestBLAKE2b256 = hash.hash(data, 'blake2b-256');
      expect(digestSHA2256).toStrictEqual(hash.sha2256(data));
      expect(digestSHA2512).toStrictEqual(hash.sha2512(data));
      expect(digestSHA2512256).toStrictEqual(hash.sha2512256(data));
      expect(digestBLAKE2b256).toStrictEqual(hash.blake2b256(data));
    }
  );
  testProp(
    'hash iterable',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const digestSHA2256 = hash.hashI(datas, 'sha2-256');
      const digestSHA2512 = hash.hashI(datas, 'sha2-512');
      const digestSHA2512256 = hash.hashI(datas, 'sha2-512-256');
      const digestBLAKE2b256 = hash.hashI(datas, 'blake2b-256');
      expect(digestSHA2256).toStrictEqual(hash.sha2256I(datas));
      expect(digestSHA2512).toStrictEqual(hash.sha2512I(datas));
      expect(digestSHA2512256).toStrictEqual(hash.sha2512256I(datas));
      expect(digestBLAKE2b256).toStrictEqual(hash.blake2b256I(datas));
    }
  );
  testProp(
    'hash generator',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const digestSHA2256 = hash.hashG('sha2-256');
      const digestSHA2512 = hash.hashG('sha2-512');
      const digestSHA2512256 = hash.hashG('sha2-512-256');
      const digestBLAKE2b256 = hash.hashG('blake2b-256');
      digestSHA2256.next();
      digestSHA2512.next();
      digestSHA2512256.next();
      digestBLAKE2b256.next();
      for (const data of datas) {
        digestSHA2256.next(data);
        digestSHA2512.next(data);
        digestSHA2512256.next(data);
        digestBLAKE2b256.next(data);
      }
      const resultSHA2256 = digestSHA2256.next(null);
      const resultSHA2512 = digestSHA2512.next(null);
      const resultSHA2512256 = digestSHA2512256.next(null);
      const resultBLAKE2b256 = digestBLAKE2b256.next(null);
      expect(resultSHA2256.done).toBe(true);
      expect(resultSHA2512.done).toBe(true);
      expect(resultSHA2512256.done).toBe(true);
      expect(resultBLAKE2b256.done).toBe(true);
      expect(resultSHA2256.value).toStrictEqual(hash.sha2256(Buffer.concat(datas)));
      expect(resultSHA2512.value).toStrictEqual(hash.sha2512(Buffer.concat(datas)));
      expect(resultSHA2512256.value).toStrictEqual(hash.sha2512256(Buffer.concat(datas)));
      expect(resultBLAKE2b256.value).toStrictEqual(hash.blake2b256(Buffer.concat(datas)));
    }
  );
  testProp(
    'to and from multidigest',
    [fc.uint8Array({ minLength: 0, maxLength: 1024 })],
    (data) => {
      const digestSHA2256 = hash.hash(data, 'sha2-256');
      const digestSHA2512 = hash.hash(data, 'sha2-512');
      const digestSHA2512256 = hash.hash(data, 'sha2-512-256');
      const digestBLAKE2b256 = hash.hash(data, 'blake2b-256');
      const mDigestSHA2256 = hash.digestToMultidigest(digestSHA2256, 'sha2-256');
      const mDigestSHA2512 = hash.digestToMultidigest(digestSHA2512, 'sha2-512');
      const mDigestSHA2512256 = hash.digestToMultidigest(digestSHA2512256, 'sha2-512-256');
      const mDigestBLAKE2b256 =  hash.digestToMultidigest(digestBLAKE2b256, 'blake2b-256');
      const digestSHA2256_ = hash.digestFromMultidigest(mDigestSHA2256.bytes)!.digest
      const digestSHA2512_ = hash.digestFromMultidigest(mDigestSHA2512.bytes)!.digest
      const digestSHA2512256_ = hash.digestFromMultidigest(mDigestSHA2512256.bytes)!.digest
      const digestBLAKE2b256_ = hash.digestFromMultidigest(mDigestBLAKE2b256.bytes)!.digest
      expect(utils.bufferWrap(digestSHA2256_)).toStrictEqual(digestSHA2256);
      expect(utils.bufferWrap(digestSHA2512_)).toStrictEqual(digestSHA2512);
      expect(utils.bufferWrap(digestSHA2512256_)).toStrictEqual(digestSHA2512256);
      expect(utils.bufferWrap(digestBLAKE2b256_)).toStrictEqual(digestBLAKE2b256);
    }
  );
});
