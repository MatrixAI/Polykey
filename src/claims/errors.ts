import { ErrorPolykey, sysexits } from '../errors';

class ErrorClaims<T> extends ErrorPolykey<T> {}

class ErrorClaimsUndefinedCanonicalizedClaim<T> extends ErrorClaims<T> {
  static description = 'Could not canonicalize claim';
  exitCode = sysexits.UNKNOWN;
}

class ErrorClaimsUndefinedClaimPayload<T> extends ErrorClaims<T> {
  static description = 'Missing claim payload';
  exitCode = sysexits.UNKNOWN;
}

class ErrorClaimsUndefinedSignatureHeader<T> extends ErrorClaims<T> {
  static description = 'Missing signature header';
  exitCode = sysexits.UNKNOWN;
}

/**
 * Exceptions arising in cross-signing process (GRPC)
 */
class ErrorCrossSign<T> extends ErrorClaims<T> {}

class ErrorEmptyStream<T> extends ErrorCrossSign<T> {
  static description = 'Unexpected end of stream';
  exitCode = sysexits.IOERR;
}

class ErrorUndefinedSinglySignedClaim<T> extends ErrorCrossSign<T> {
  static description: string =
    'An expected singly signed claim was not received';
  exitCode = sysexits.USAGE;
}

class ErrorUndefinedDoublySignedClaim<T> extends ErrorCrossSign<T> {
  static description: string =
    'An expected doubly signed claim was not received';
  exitCode = sysexits.USAGE;
}

class ErrorUndefinedSignature<T> extends ErrorCrossSign<T> {
  static description: string =
    'A received claim does not have an expected signature';
  exitCode = sysexits.CONFIG;
}

class ErrorSinglySignedClaimVerificationFailed<T> extends ErrorCrossSign<T> {
  static description = 'Unable to verify intermediary claim';
  exitCode = sysexits.CONFIG;
}

class ErrorDoublySignedClaimVerificationFailed<T> extends ErrorCrossSign<T> {
  static description = 'Unable to verify claim';
  exitCode = sysexits.CONFIG;
}

/**
 * Exceptions arising during schema validation
 */
class ErrorSchemaValidate<T> extends ErrorClaims<T> {}

class ErrorClaimValidationFailed<T> extends ErrorSchemaValidate<T> {
  static description = 'Claim data does not match schema';
  exitCode = sysexits.CONFIG;
}

class ErrorNodesClaimType<T> extends ErrorSchemaValidate<T> {
  static description = 'Invalid claim type';
  exitCode = sysexits.CONFIG;
}

class ErrorIdentitiesClaimType<T> extends ErrorSchemaValidate<T> {
  static description = 'Invalid claim type';
  exitCode = sysexits.CONFIG;
}

class ErrorSinglySignedClaimNumSignatures<T> extends ErrorSchemaValidate<T> {
  static description = 'Claim is not signed or has more than one signature';
  exitCode = sysexits.CONFIG;
}

class ErrorDoublySignedClaimNumSignatures<T> extends ErrorSchemaValidate<T> {
  static description = 'Claim is not signed or does not have two signatures';
  exitCode = sysexits.CONFIG;
}

class ErrorSinglySignedClaimValidationFailed<
  T,
> extends ErrorSchemaValidate<T> {
  static description = 'Claim data does not match schema';
  exitCode = sysexits.CONFIG;
}

class ErrorDoublySignedClaimValidationFailed<
  T,
> extends ErrorSchemaValidate<T> {
  static description = 'Claim data does not match schema';
  exitCode = sysexits.CONFIG;
}

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
