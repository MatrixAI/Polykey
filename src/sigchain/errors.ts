import { ErrorPolykey } from '../errors';

class ErrorSigchain<T> extends ErrorPolykey<T> {}

class ErrorSigchainRunning<T> extends ErrorSigchain<T> {}

class ErrorSigchainNotRunning<T> extends ErrorSigchain<T> {}

class ErrorSigchainDestroyed<T> extends ErrorSigchain<T> {}

class ErrorSigchainSequenceNumUndefined<T> extends ErrorSigchain<T> {}

class ErrorSigchainClaimUndefined<T> extends ErrorSigchain<T> {}

class ErrorSigchainInvalidSequenceNum<T> extends ErrorSigchain<T> {}

class ErrorSigchainInvalidHash<T> extends ErrorSigchain<T> {}

class ErrorSighainClaimVerificationFailed<T> extends ErrorSigchain<T> {}

class ErrorSigchainDecrypt<T> extends ErrorSigchain<T> {}

class ErrorSigchainParse<T> extends ErrorSigchain<T> {}

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
