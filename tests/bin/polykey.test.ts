import { pkWithStdio } from './utils';

describe('polykey', () => {
  test('default help display', async () => {
    const result = await pkWithStdio([]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr.length > 0).toBe(true);
  });
});
