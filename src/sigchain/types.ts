import type { TokenPayload } from '../tokens/types';
import type { ClaimHeaderSignature, ClaimDefault } from '../claims/types';

/**
 * During the creation of `Claim`, only properties that are not automatically
 * defined by `Sigchain` are allowed.
 */
type ClaimInput = TokenPayload & {
  [Property in keyof ClaimDefault]?: undefined;
}

/**
 * Storing `ClaimHeaderSignature` into the `Sigchain` requires JSON serialisation.
 * The signature is a `Buffer`, which will be converted to JSON and back.
 */
interface ClaimHeaderSignatureJSON extends Omit<ClaimHeaderSignature, 'signature'> {
  signature: {
    type: 'Buffer',
    data: Array<number>
  };
}

export type {
  ClaimInput,
  ClaimHeaderSignatureJSON,
};
