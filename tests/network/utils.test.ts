import type { Host, Hostname, Port } from '@/network/types';
import * as networkUtils from '@/network/utils';

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
      networkUtils.resolveHostname('www.google.com' as Hostname),
    ).resolves.toBeDefined();
    const hosts = await networkUtils.resolveHostname(
      'www.google.com' as Hostname,
    );
    expect(hosts.length).toBeGreaterThan(0);
    await expect(
      networkUtils.resolveHostname('invalidHostname' as Hostname),
    ).resolves.toHaveLength(0);
  });
});
