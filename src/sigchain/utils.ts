import type { PublicKey } from '../keys/types';
import type { ChainData, ChainDataEncoded } from './types';
import * as claimsUtils from '../claims/utils';

/**
 * Verifies each claim in a ChainDataEncoded record, and returns a ChainData
 * record containing the decoded Claims.
 */
async function verifyChainData(
  chain: ChainDataEncoded,
  publicKey: PublicKey,
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
    decodedChain[claimId] = claimsUtils.decodeClaim(encodedClaim);
  }
  return decodedChain;
}

export { verifyChainData };
