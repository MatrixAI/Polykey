import { ErrorPolykey } from '../errors';

class ErrorSigchain extends ErrorPolykey {}

class ErrorSigchainNotStarted extends ErrorSigchain {}

class ErrorSigchainSequenceNumUndefined extends ErrorSigchain {}

class ErrorSigchainClaimUndefined extends ErrorSigchain {}

class ErrorSighainClaimVerificationFailed extends ErrorSigchain {}

class ErrorSigchainDecrypt extends ErrorSigchain {}

class ErrorSigchainParse extends ErrorSigchain {}

export {
  ErrorSigchainNotStarted,
  ErrorSigchainSequenceNumUndefined,
  ErrorSigchainClaimUndefined,
  ErrorSighainClaimVerificationFailed,
  ErrorSigchainDecrypt,
  ErrorSigchainParse,
};
