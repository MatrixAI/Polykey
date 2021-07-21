import type { Claim, ClaimId, ClaimEncoded } from '../claims/types';

/**
 * Serialized version of a node's sigchain.
 * Currently used for storage in the gestalt graph.
 */
type ChainData = Record<ClaimId, Claim>;

/**
 * Serialized version of a node's sigchain, but with the claims as
 * Should be used when needing to transport ChainData, such that the claims can
 * be verified without having to be re-encoded as ClaimEncoded types.
 */
type ChainDataEncoded = Record<ClaimId, ClaimEncoded>;

export type { ChainData, ChainDataEncoded };
