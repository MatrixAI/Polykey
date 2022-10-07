import * as random from '@/keys/utils/random';

describe('keys/utils/random', () => {
  test('get random bytes less than 65536', async () => {
    for (let i = 0; i < 100; i++) {
      let data = await random.getRandomBytes(64 * 1024);
      expect(data.byteLength).toBe(64 * 1024);
      expect(data).toBeInstanceOf(Buffer);
      data = random.getRandomBytesSync(64 * 1024);
      expect(data.byteLength).toBe(64 * 1024);
      expect(data).toBeInstanceOf(Buffer);
    }
  });
  test('get random bytes more than 65536', async () => {
    for (let i = 0; i < 100; i++) {
      let data = await random.getRandomBytes(70 * 1024);
      expect(data.byteLength).toBe(70 * 1024);
      expect(data).toBeInstanceOf(Buffer);
      data = random.getRandomBytesSync(70 * 1024);
      expect(data.byteLength).toBe(70 * 1024);
      expect(data).toBeInstanceOf(Buffer);
    }
  });
  test('get random bytes equal to 65536', async () => {
    for (let i = 0; i < 100; i++) {
      let data = await random.getRandomBytes(65536);
      expect(data.byteLength).toBe(65536);
      expect(data).toBeInstanceOf(Buffer);
      data = random.getRandomBytesSync(65536);
      expect(data.byteLength).toBe(65536);
      expect(data).toBeInstanceOf(Buffer);
    }
  });
});
