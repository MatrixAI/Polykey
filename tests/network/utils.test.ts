import type { Host, Hostname, Port } from '@/network/types';
import * as networkUtils from '@/network/utils';

describe('utils', () => {
  test('validating hosts', () => {
    // IPv4
    expect(networkUtils.isHost('127.0.0.1')).toBeTrue();
    // IPv6
    expect(networkUtils.isHost('::')).toBeTrue();
    expect(networkUtils.isHost('::0')).toBeTrue();
    expect(networkUtils.isHost('2001:db8::')).toBeTrue();
    expect(networkUtils.isHost('::1234:5678')).toBeTrue();
    expect(networkUtils.isHost('2001:db8::1234:5678')).toBeTrue();
    expect(networkUtils.isHost('2001:db8:1::ab9:C0A8:102')).toBeTrue();
    expect(networkUtils.isHost('2001:db8:3333:4444:5555:6666:7777:8888')).toBeTrue();
    expect(networkUtils.isHost('2001:0db8:0001:0000:0000:0ab9:C0A8:0102')).toBeTrue();
    // Link-Local
    expect(networkUtils.isHost('fe80::210:5aff:feaa:20a2%eth0')).toBeTrue();
  });
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
    expect(networkUtils.resolvesZeroIP('0.0.0.0' as Host)).toBe('127.0.0.1');
    expect(networkUtils.resolvesZeroIP('::' as Host)).toBe('::1');
    expect(
      networkUtils.resolvesZeroIP(
        '0000:0000:0000:0000:0000:0000:0000:0000' as Host,
      ),
    ).toBe('::1');
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
