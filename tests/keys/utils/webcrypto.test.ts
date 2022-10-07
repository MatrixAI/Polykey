import webcrypto from '@/keys/utils/webcrypto';

describe('keys/utils/webcrypto', () => {
  test('webcrypto polyfill is monkey patched globally', async () => {
    expect(globalThis.crypto).toBe(webcrypto);
  });
});
