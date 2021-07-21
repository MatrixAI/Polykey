import { ErrorPolykey } from '../errors';

class ErrorClaims extends ErrorPolykey {}

class ErrorClaimsUndefinedCanonicalizedClaim extends ErrorClaims {}

class ErrorClaimsUndefinedClaimPayload extends ErrorClaims {}

class ErrorClaimsUndefinedSignatureHeader extends ErrorClaims {}

export {
  ErrorClaims,
  ErrorClaimsUndefinedCanonicalizedClaim,
  ErrorClaimsUndefinedClaimPayload,
  ErrorClaimsUndefinedSignatureHeader,
};
