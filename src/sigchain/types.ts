import type { TokenPayload } from '../tokens/types';
import type { ClaimDefault } from '../claims/types';

/**
 * During the creation of `Claim`, only properties that are not automatically
 * defined by `Sigchain` are allowed.
 */
type ClaimInput = TokenPayload & {
  [Property in keyof ClaimDefault]?: undefined;
};

export type { ClaimInput };
