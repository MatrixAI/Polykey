import { testProp, fc } from '@fast-check/jest';
import * as random from '@/keys/utils/random';

describe('keys/utils/random', () => {
  test('get random bytes less than 65536', () => {
    for (let i = 0; i < 100; i++) {
      let data = random.getRandomBytes(64 * 1024);
      expect(data.byteLength).toBe(64 * 1024);
      expect(data).toBeInstanceOf(Buffer);
      data = random.getRandomBytes(64 * 1024);
      expect(data.byteLength).toBe(64 * 1024);
      expect(data).toBeInstanceOf(Buffer);
    }
  });
  test('get random bytes more than 65536', () => {
    for (let i = 0; i < 100; i++) {
      let data = random.getRandomBytes(70 * 1024);
      expect(data.byteLength).toBe(70 * 1024);
      expect(data).toBeInstanceOf(Buffer);
      data = random.getRandomBytes(70 * 1024);
      expect(data.byteLength).toBe(70 * 1024);
      expect(data).toBeInstanceOf(Buffer);
    }
  });
  test('get random bytes equal to 65536', () => {
    for (let i = 0; i < 100; i++) {
      let data = random.getRandomBytes(65536);
      expect(data.byteLength).toBe(65536);
      expect(data).toBeInstanceOf(Buffer);
      data = random.getRandomBytes(65536);
      expect(data.byteLength).toBe(65536);
      expect(data).toBeInstanceOf(Buffer);
    }
  });
  testProp(
    'get random bytes deterministically',
    [fc.integer({ min: 0, max: 1000 })],
    (seed) => {
      const data1 = random.getRandomBytes(32, seed);
      const data2 = random.getRandomBytes(32, seed);
      expect(data1).toStrictEqual(data2);
    },
  );
});
