import { ErrorPolykey } from '../errors';

class ErrorClaims extends ErrorPolykey {}

class ErrorClaimsUndefinedCanonicalizedClaim extends ErrorClaims {}

class ErrorClaimsUndefinedClaimPayload extends ErrorClaims {}

class ErrorClaimsUndefinedSignatureHeader extends ErrorClaims {}

/**
 * Exceptions arising in cross-signing process (GRPC)
 */
class ErrorCrossSign extends ErrorClaims {}

class ErrorEmptyStream extends ErrorCrossSign {}

class ErrorUndefinedSinglySignedClaim extends ErrorCrossSign {
  description: string = 'An expected singly signed claim was not received';
}

class ErrorUndefinedDoublySignedClaim extends ErrorCrossSign {
  description: string = 'An expected doubly signed claim was not received';
}

class ErrorUndefinedSignature extends ErrorCrossSign {
  description: string = 'A received claim does not have an expected signature';
}

class ErrorSinglySignedClaimVerificationFailed extends ErrorCrossSign {}

class ErrorDoublySignedClaimVerificationFailed extends ErrorCrossSign {}

/**
 * Exceptions arising during schema validation
 */
class ErrorSchemaValidate extends ErrorClaims {}

class ErrorClaimValidationFailed extends ErrorSchemaValidate {}

class ErrorNodesClaimType extends ErrorSchemaValidate {}

class ErrorIdentitiesClaimType extends ErrorSchemaValidate {}

class ErrorSinglySignedClaimNumSignatures extends ErrorSchemaValidate {}

class ErrorDoublySignedClaimNumSignatures extends ErrorSchemaValidate {}

class ErrorSinglySignedClaimValidationFailed extends ErrorSchemaValidate {}

class ErrorDoublySignedClaimValidationFailed extends ErrorSchemaValidate {}

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
