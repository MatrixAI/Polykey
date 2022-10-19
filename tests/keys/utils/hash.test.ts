import { testProp, fc } from '@fast-check/jest';
import * as hash from '@/keys/utils/hash';

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
    'sha2-256 generator',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const hasher = hash.sha2256G();
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
});
