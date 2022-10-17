import { testProp, fc } from '@fast-check/jest';
import * as hash from '@/keys/utils/hash';

describe('keys/utils/hash', () => {
  testProp(
    'sha256',
    [fc.uint8Array({ minLength: 0, maxLength: 1024 })],
    (data) => {
      const digest1 = hash.sha256(data);
      const digest2 = hash.sha256(data);
      expect(digest1).toHaveLength(32);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha512',
    [fc.uint8Array({ minLength: 0, maxLength: 1024 })],
    (data) => {
      const digest1 = hash.sha512(data);
      const digest2 = hash.sha512(data);
      expect(digest1).toHaveLength(64);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha256 iterable',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const digest1 = hash.sha256I(datas);
      const digest2 = hash.sha256(Buffer.concat(datas));
      expect(digest1).toHaveLength(32);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha512 iterable',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const digest1 = hash.sha512I(datas);
      const digest2 = hash.sha512(Buffer.concat(datas));
      expect(digest1).toHaveLength(64);
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha256 generator',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const hasher = hash.sha256G();
      for (const data of datas) {
        hasher.next(data);
      }
      const result = hasher.next(null);
      const digest1 = result.value;
      expect(result.done).toBe(true);
      expect(digest1).toHaveLength(32);
      const digest2 = hash.sha256(Buffer.concat(datas));
      expect(digest1).toStrictEqual(digest2);
    }
  );
  testProp(
    'sha512 generator',
    [
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 }))
    ],
    (datas) => {
      const hasher = hash.sha512G();
      for (const data of datas) {
        hasher.next(data);
      }
      const result = hasher.next(null);
      const digest1 = result.value;
      expect(result.done).toBe(true);
      expect(digest1).toHaveLength(64);
      const digest2 = hash.sha512(Buffer.concat(datas));
      expect(digest1).toStrictEqual(digest2);
    }
  );
});
