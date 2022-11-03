import type {
  NodeId,
  ClaimId,
  CertId,
  ProviderId,
  IdentityId,
} from '@/ids/types';
import { fc } from '@fast-check/jest';
import { IdInternal } from '@matrixai/id';
import * as ids from '@/ids';

const nodeIdArb = fc.uint8Array({ minLength: 32, maxLength: 32 }).map(
  IdInternal.create
) as fc.Arbitrary<NodeId>;

const nodeIdEncodedArb = nodeIdArb.map(ids.encodeNodeId);

const claimIdArb = fc.uint8Array({
  minLength: 16,
  maxLength: 16,
}).map(IdInternal.create) as fc.Arbitrary<ClaimId>;

const claimIdEncodedArb = claimIdArb.map(ids.encodeClaimId);

const certIdArb = fc.uint8Array({
  minLength: 16,
  maxLength: 16,
}).map(IdInternal.create) as fc.Arbitrary<CertId>;

const certIdEncodedArb = certIdArb.map(ids.encodeCertId);

const providerIdArb = fc.constantFrom(
  'github.com',
  'facebook.com',
  'twitter.com',
  'google.com',
  'linkedin.com'
) as fc.Arbitrary<ProviderId>;

const identityIdArb = fc.string() as fc.Arbitrary<IdentityId>;

const providerIdentityIdArb = fc.tuple(providerIdArb, identityIdArb);

const providerIdentityIdEncodedArb = providerIdentityIdArb.map(
  ids.encodeProviderIdentityId
);

export {
  nodeIdArb,
  nodeIdEncodedArb,
  claimIdArb,
  claimIdEncodedArb,
  certIdArb,
  certIdEncodedArb,
  providerIdArb,
  identityIdArb,
  providerIdentityIdArb,
  providerIdentityIdEncodedArb,
};
