import * as testBinUtils from './utils';

describe('polykey', () => {
  test('default help display', async () => {
    const result = await testBinUtils.pkStdio([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr.length > 0).toBe(true);
  });
});
