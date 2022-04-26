import { ErrorPolykey } from '../errors';

class ErrorClaims<T> extends ErrorPolykey<T> {}

class ErrorClaimsUndefinedCanonicalizedClaim<T> extends ErrorClaims<T> {}

class ErrorClaimsUndefinedClaimPayload<T> extends ErrorClaims<T> {}

class ErrorClaimsUndefinedSignatureHeader<T> extends ErrorClaims<T> {}

/**
 * Exceptions arising in cross-signing process (GRPC)
 */
class ErrorCrossSign<T> extends ErrorClaims<T> {}

class ErrorEmptyStream<T> extends ErrorCrossSign<T> {}

class ErrorUndefinedSinglySignedClaim<T> extends ErrorCrossSign<T> {
  static description: string =
    'An expected singly signed claim was not received';
}

class ErrorUndefinedDoublySignedClaim<T> extends ErrorCrossSign<T> {
  static description: string =
    'An expected doubly signed claim was not received';
}

class ErrorUndefinedSignature<T> extends ErrorCrossSign<T> {
  static description: string =
    'A received claim does not have an expected signature';
}

class ErrorSinglySignedClaimVerificationFailed<T> extends ErrorCrossSign<T> {}

class ErrorDoublySignedClaimVerificationFailed<T> extends ErrorCrossSign<T> {}

/**
 * Exceptions arising during schema validation
 */
class ErrorSchemaValidate<T> extends ErrorClaims<T> {}

class ErrorClaimValidationFailed<T> extends ErrorSchemaValidate<T> {}

class ErrorNodesClaimType<T> extends ErrorSchemaValidate<T> {}

class ErrorIdentitiesClaimType<T> extends ErrorSchemaValidate<T> {}

class ErrorSinglySignedClaimNumSignatures<T> extends ErrorSchemaValidate<T> {}

class ErrorDoublySignedClaimNumSignatures<T> extends ErrorSchemaValidate<T> {}

class ErrorSinglySignedClaimValidationFailed<
  T,
> extends ErrorSchemaValidate<T> {}

class ErrorDoublySignedClaimValidationFailed<
  T,
> extends ErrorSchemaValidate<T> {}

export {
  ErrorClaims,
  ErrorClaimsUndefinedCanonicalizedClaim,
  ErrorClaimsUndefinedClaimPayload,
  ErrorClaimsUndefinedSignatureHeader,
  ErrorEmptyStream,
  ErrorUndefinedSinglySignedClaim,
  ErrorUndefinedDoublySignedClaim,
  ErrorUndefinedSignature,
  ErrorSinglySignedClaimVerificationFailed,
  ErrorDoublySignedClaimVerificationFailed,
  ErrorClaimValidationFailed,
  ErrorNodesClaimType,
  ErrorIdentitiesClaimType,
  ErrorSinglySignedClaimNumSignatures,
  ErrorDoublySignedClaimNumSignatures,
  ErrorSinglySignedClaimValidationFailed,
  ErrorDoublySignedClaimValidationFailed,
};
