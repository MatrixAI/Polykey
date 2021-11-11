import type { Host, Port } from '@/network/types';

import { utils as networkUtils, errors as networkErrors } from '@/network';

describe('utils', () => {
  test('building addresses', async () => {
    expect(networkUtils.buildAddress('127.0.0.1' as Host, 0 as Port)).toBe(
      '127.0.0.1:0',
    );
    expect(networkUtils.buildAddress('::1' as Host, 100 as Port)).toBe(
      '[::1]:100',
    );
    expect(networkUtils.buildAddress('::' as Host, 0 as Port)).toBe('[::]:0');
  });
  test('resolving zero IPs', async () => {
    expect(networkUtils.resolvesZeroIP('0.0.0.0' as Host)).toBe(
      '127.0.0.1' as Host,
    );
    expect(networkUtils.resolvesZeroIP('::' as Host)).toBe('::1' as Host);
    expect(
      networkUtils.resolvesZeroIP(
        '0000:0000:0000:0000:0000:0000:0000:0000' as Host,
      ),
    ).toBe('::1' as Host);
  });
  test('resolving hostnames', async () => {
    await expect(
      networkUtils.resolveHost('www.google.com' as Host),
    ).resolves.toBeDefined();
    const host = await networkUtils.resolveHost('www.google.com' as Host);
    expect(networkUtils.isValidHost(host)).toBeTruthy();
    await expect(
      networkUtils.resolveHost('invalidHostname' as Host),
    ).rejects.toThrow(networkErrors.ErrorHostnameResolutionFailed);
  });
});
