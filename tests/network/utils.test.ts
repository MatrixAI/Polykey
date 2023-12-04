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
    expect(
      networkUtils.isHost('2001:db8:3333:4444:5555:6666:7777:8888'),
    ).toBeTrue();
    expect(
      networkUtils.isHost('2001:0db8:0001:0000:0000:0ab9:C0A8:0102'),
    ).toBeTrue();
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
  test('canonicalizing IPs', async () => {
    // IPv4 -> IPv4

    // Local
    expect(networkUtils.toCanonicalHost('127.0.0.1')).toBe('127.0.0.1');
    // Wildcard
    expect(networkUtils.toCanonicalHost('0.0.0.0')).toBe('0.0.0.0');
    expect(networkUtils.toCanonicalHost('255.255.255.255')).toBe(
      '255.255.255.255',
    );
    expect(networkUtils.toCanonicalHost('74.125.43.99')).toBe('74.125.43.99');
    // Leading zeros are removed
    expect(networkUtils.toCanonicalHost('192.168.001.001')).toBe('192.168.1.1');

    // IPv6 -> IPv6

    // Local
    expect(networkUtils.toCanonicalHost('::1')).toBe('0:0:0:0:0:0:0:1');
    // Wildcard
    expect(networkUtils.toCanonicalHost('::0')).toBe('0:0:0:0:0:0:0:0');
    // Lowercase
    expect(networkUtils.toCanonicalHost('ABC:0:0:CD30:ABC:0:0:CD30')).toBe(
      'abc:0:0:cd30:abc:0:0:cd30',
    );
    // Quad zeros are reduced to a single 0
    expect(
      networkUtils.toCanonicalHost('0ABC:0000:0000:CD30:0ABC:0000:0000:CD30'),
    ).toBe('abc:0:0:cd30:abc:0:0:cd30');
    // Double colon is expanded
    expect(networkUtils.toCanonicalHost('FE80::0202:B3FF:FE1E:8329')).toBe(
      'fe80:0:0:0:202:b3ff:fe1e:8329',
    );
    expect(networkUtils.toCanonicalHost('::1234:7f00:1')).toBe(
      '0:0:0:0:0:1234:7f00:1',
    );
    expect(networkUtils.toCanonicalHost('::1234:0:0')).toBe(
      '0:0:0:0:0:1234:0:0',
    );
    expect(networkUtils.toCanonicalHost('::1234:ffff:ffff')).toBe(
      '0:0:0:0:0:1234:ffff:ffff',
    );
    expect(networkUtils.toCanonicalHost('::1234:4a7d:2b63')).toBe(
      '0:0:0:0:0:1234:4a7d:2b63',
    );
    // Scoped
    expect(networkUtils.toCanonicalHost('::1%eth1')).toBe(
      '0:0:0:0:0:0:0:1%eth1',
    );

    // IPv4 mapped hex -> IPv4

    expect(networkUtils.toCanonicalHost('::ffff:7f00:1')).toBe('127.0.0.1');
    expect(networkUtils.toCanonicalHost('::ffff:0:0')).toBe('0.0.0.0');
    expect(networkUtils.toCanonicalHost('::ffff:ffff:ffff')).toBe(
      '255.255.255.255',
    );
    expect(networkUtils.toCanonicalHost('::ffff:4a7d:2b63')).toBe(
      '74.125.43.99',
    );

    // IPv4 mapped dec -> IPv4

    expect(networkUtils.toCanonicalHost('::ffff:127.0.0.1')).toBe('127.0.0.1');
    expect(networkUtils.toCanonicalHost('::ffff:0.0.0.0')).toBe('0.0.0.0');
    expect(networkUtils.toCanonicalHost('::ffff:255.255.255.255')).toBe(
      '255.255.255.255',
    );
    expect(networkUtils.toCanonicalHost('::ffff:74.125.43.99')).toBe(
      '74.125.43.99',
    );
  });
});
