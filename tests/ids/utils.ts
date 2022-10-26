import type { NodeId, ClaimId } from '@/ids/types';
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

export {
  nodeIdArb,
  nodeIdEncodedArb,
  claimIdArb,
  claimIdEncodedArb,
};
