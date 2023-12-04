import type { Host, Hostname, Port } from '@/network/types';
import { fc } from '@fast-check/jest';

const hostArb = fc.oneof(fc.ipV4(), fc.ipV6()) as fc.Arbitrary<Host>;

const hostnameArb = fc.domain() as fc.Arbitrary<Hostname>;

const portArb = fc.integer({
  min: 1,
  max: 65_535,
}) as fc.Arbitrary<Port>;

export { hostArb, hostnameArb, portArb };
