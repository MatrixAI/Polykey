import * as validationUtils from '@/validation/utils';
import * as validationErrors from '@/validation/errors';

describe('nodes validationUtils', () => {
  const nodeIdEncoded1 =
    'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0';
  const nodeIdEncoded2 =
    'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg';
  const nodeIdEncoded3 =
    'vi3et1hrpv2m2lrplcm7cu913kr45v51cak54vm68anlbvuf83ra0';
  const hostname = 'testnet.polykey.io';
  const hostIPv4 = '127.0.0.1';
  const hostIPv6 = '[2001:db8:85a3:8d3:1319:8a2e:370:7348]';
  const port1 = 1314;
  const port2 = 1315;
  const port3 = 1316;
  test('parseSeedNodes - valid seed nodes (using hostname, IPv4, IPv6)', () => {
    const rawSeedNodes =
      `${nodeIdEncoded1}@${hostname}:${port1};` +
      `${nodeIdEncoded2}@${hostIPv4}:${port2};` +
      `${nodeIdEncoded3}@${hostIPv6}:${port3};`;
    const parsed = validationUtils.parseSeedNodes(rawSeedNodes);
    const seeds = parsed[0];
    expect(seeds[nodeIdEncoded1]).toStrictEqual({
      host: hostname,
      port: port1,
    });
    expect(seeds[nodeIdEncoded2]).toStrictEqual({
      host: hostIPv4,
      port: port2,
    });
    expect(seeds[nodeIdEncoded3]).toStrictEqual({
      host: hostIPv6.replace(/\[|\]/g, ''),
      port: port3,
    });
    expect(parsed[1]).toBeFalsy();
  });
  test('parseSeedNodes - invalid node ID', () => {
    const rawSeedNodes = `INVALIDNODEID@${hostname}:${port1}`;
    expect(() => validationUtils.parseSeedNodes(rawSeedNodes)).toThrow(
      validationErrors.ErrorParse,
    );
  });
  test('parseSeedNodes - invalid hostname', () => {
    const rawSeedNodes = `${nodeIdEncoded1}@$invalidHost:${port1}`;
    expect(() => validationUtils.parseSeedNodes(rawSeedNodes)).toThrow(
      validationErrors.ErrorParse,
    );
  });
  test.todo('parseSeedNodes - invalid port');
  test.todo('parseSeedNodes - invalid structure');
});
