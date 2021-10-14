import type { PublicKeyPem } from '../keys/types';
import type { ChainData, ChainDataEncoded } from './types';
import type { ClaimId, ClaimIdString } from "../claims/types";

import * as claimsUtils from '../claims/utils';
import { IdSortable } from "@matrixai/id";
import { isRandomId, isRawRandomId, makeRandomId, makeRawRandomId } from "@/GenericIdTypes";
import { NodeId } from "../nodes/types";
import { toArrayBuffer } from "@matrixai/db/dist/utils";

/**
 * Verifies each claim in a ChainDataEncoded record, and returns a ChainData
 * record containing the decoded Claims.
 */
async function verifyChainData(
  chain: ChainDataEncoded,
  publicKey: PublicKeyPem,
): Promise<ChainData> {
  const decodedChain: ChainData = {};
  for (const claimId in chain) {
    const encodedClaim = chain[claimId];
    // Verify the claim
    // If the claim can't be verified, we simply don't add it to the decoded chain
    if (!(await claimsUtils.verifyClaimSignature(encodedClaim, publicKey))) {
      continue;
    }
    // If verified, add the claim to the decoded chain
    decodedChain[claimId] = await claimsUtils.decodeClaim(
      encodedClaim,
    );
  }
  return decodedChain;
}

function isClaimId(arg): arg is ClaimId {
  return isRawRandomId<ClaimId>(arg);
}

function makeClaimId(arg) {
  return makeRawRandomId<ClaimId>(arg);
}

function isClaimIdString(arg): arg is ClaimIdString {
  return isRandomId<ClaimIdString>(arg);
}

function makeClaimIdString(arg) {
  return makeRandomId<ClaimIdString>(arg);
}

function createClaimIdGenerator(nodeId: NodeId, lastClaimId?: ClaimId) {
  const generator = new IdSortable({
    lastId: (lastClaimId != null) ? toArrayBuffer(lastClaimId) : lastClaimId,
    nodeId: toArrayBuffer(Buffer.from(nodeId)),
  });
  return () => makeClaimId(Buffer.from(generator.get()));
}

export {
  verifyChainData,
  isClaimId,
  makeClaimId,
  isClaimIdString,
  makeClaimIdString,
  createClaimIdGenerator
};
