import { ErrorPolykey, sysexits } from '../errors';

class ErrorClaims<T> extends ErrorPolykey<T> {}

class ErrorClaimsUndefinedClaimPayload<T> extends ErrorClaims<T> {
  static description = 'Missing claim payload';
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

class ErrorNodesClaimType<T> extends ErrorSchemaValidate<T> {
  static description = 'Invalid claim type';
  exitCode = sysexits.CONFIG;
}

export {
  ErrorClaims,
  ErrorClaimsUndefinedClaimPayload,
  ErrorEmptyStream,
  ErrorUndefinedSinglySignedClaim,
  ErrorUndefinedDoublySignedClaim,
  ErrorUndefinedSignature,
  ErrorSinglySignedClaimVerificationFailed,
  ErrorDoublySignedClaimVerificationFailed,
  ErrorNodesClaimType,
};
