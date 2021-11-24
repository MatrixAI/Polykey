import { ErrorPolykey } from '../errors';

class ErrorSigchain extends ErrorPolykey {}

class ErrorSigchainRunning extends ErrorSigchain {}

class ErrorSigchainNotRunning extends ErrorSigchain {}

class ErrorSigchainDestroyed extends ErrorSigchain {}

class ErrorSigchainSequenceNumUndefined extends ErrorSigchain {}

class ErrorSigchainClaimUndefined extends ErrorSigchain {}

class ErrorSigchainInvalidSequenceNum extends ErrorSigchain {}

class ErrorSigchainInvalidHash extends ErrorSigchain {}

class ErrorSighainClaimVerificationFailed extends ErrorSigchain {}

class ErrorSigchainDecrypt extends ErrorSigchain {}

class ErrorSigchainParse extends ErrorSigchain {}

export {
  ErrorSigchainRunning,
  ErrorSigchainNotRunning,
  ErrorSigchainDestroyed,
  ErrorSigchainSequenceNumUndefined,
  ErrorSigchainClaimUndefined,
  ErrorSigchainInvalidSequenceNum,
  ErrorSigchainInvalidHash,
  ErrorSighainClaimVerificationFailed,
  ErrorSigchainDecrypt,
  ErrorSigchainParse,
};
