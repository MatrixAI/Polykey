import type {
  NodeId,
  ClaimId,
  CertId,
  ProviderId,
  IdentityId,
  VaultId,
  GestaltLinkId,
  ProviderIdentityClaimId,
} from '@/ids/types';
import { fc } from '@fast-check/jest';
import { IdInternal } from '@matrixai/id';
import * as ids from '@/ids';

const nodeIdArb = fc
  .uint8Array({ minLength: 32, maxLength: 32 })
  .map(IdInternal.create) as fc.Arbitrary<NodeId>;

const nodeIdStringArb = nodeIdArb.map((id) => id.toString());

const nodeIdEncodedArb = nodeIdArb.map(ids.encodeNodeId);

const claimIdArb = fc
  .uint8Array({
    minLength: 16,
    maxLength: 16,
  })
  .map(IdInternal.create) as fc.Arbitrary<ClaimId>;

const claimIdEncodedArb = claimIdArb.map(ids.encodeClaimId);

const certIdArb = fc
  .uint8Array({
    minLength: 16,
    maxLength: 16,
  })
  .map(IdInternal.create) as fc.Arbitrary<CertId>;

const certIdEncodedArb = certIdArb.map(ids.encodeCertId);

const providerIdArb = fc.constantFrom(
  'github.com',
  'facebook.com',
  'twitter.com',
  'google.com',
  'linkedin.com',
) as fc.Arbitrary<ProviderId>;

const identityIdArb = fc.string() as fc.Arbitrary<IdentityId>;

const providerIdentityIdArb = fc.tuple(providerIdArb, identityIdArb);

const providerIdentityIdEncodedArb = providerIdentityIdArb.map(
  ids.encodeProviderIdentityId,
);

const providerIdentityClaimIdArb =
  fc.string() as fc.Arbitrary<ProviderIdentityClaimId>;

const vaultIdArb = fc
  .uint8Array({
    minLength: 16,
    maxLength: 16,
  })
  .map(IdInternal.create) as fc.Arbitrary<VaultId>;

const vaultIdStringArb = vaultIdArb.map((id) => id.toString());

const vaultIdEncodedArb = vaultIdArb.map(ids.encodeVaultId);

const gestaltLinkIdArb = fc
  .uint8Array({
    minLength: 16,
    maxLength: 16,
  })
  .map(IdInternal.create) as fc.Arbitrary<GestaltLinkId>;

export {
  nodeIdArb,
  nodeIdStringArb,
  nodeIdEncodedArb,
  claimIdArb,
  claimIdEncodedArb,
  certIdArb,
  certIdEncodedArb,
  providerIdArb,
  identityIdArb,
  providerIdentityIdArb,
  providerIdentityIdEncodedArb,
  providerIdentityClaimIdArb,
  vaultIdArb,
  vaultIdStringArb,
  vaultIdEncodedArb,
  gestaltLinkIdArb,
};
