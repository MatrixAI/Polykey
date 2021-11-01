import { ErrorPolykey, sysexits } from '../errors';

class ErrorKeys extends ErrorPolykey {}

class ErrorKeyManagerRunning extends ErrorKeys {}

class ErrorKeyManagerNotRunning extends ErrorKeys {}

class ErrorKeyManagerDestroyed extends ErrorKeys {}

class ErrorKeysPasswordInvalid extends ErrorKeys {
  description = 'Password has invalid format';
  exitCode = sysexits.USAGE;
}

class ErrorKeysRecoveryCodeInvalid extends ErrorKeys {
  description = 'Recovery code has invalid format';
  exitCode = sysexits.USAGE;
}

class ErrorKeysRecoveryCodeIncorrect extends ErrorKeys {
  description =
    "Recovered key pair's public key does not match the root public key";
  exitCode = sysexits.USAGE;
}

class ErrorRootKeysRead extends ErrorKeys {}

class ErrorRootKeysParse extends ErrorKeys {}

class ErrorRootKeysWrite extends ErrorKeys {}

class ErrorRootCertRead extends ErrorKeys {}

class ErrorRootCertWrite extends ErrorKeys {}

class ErrorRootCertRenew extends ErrorKeys {}

class ErrorRootCertsGC extends ErrorKeys {}

class ErrorEncryptSize extends ErrorKeys {}

class ErrorDBKeyRead extends ErrorKeys {}

class ErrorDBKeyWrite extends ErrorKeys {}

class ErrorDBKeyParse extends ErrorKeys {}

export {
  ErrorKeys,
  ErrorKeyManagerRunning,
  ErrorKeyManagerNotRunning,
  ErrorKeyManagerDestroyed,
  ErrorKeysPasswordInvalid,
  ErrorKeysRecoveryCodeInvalid,
  ErrorKeysRecoveryCodeIncorrect,
  ErrorRootKeysRead,
  ErrorRootKeysParse,
  ErrorRootKeysWrite,
  ErrorRootCertRead,
  ErrorRootCertWrite,
  ErrorRootCertRenew,
  ErrorRootCertsGC,
  ErrorEncryptSize,
  ErrorDBKeyRead,
  ErrorDBKeyWrite,
  ErrorDBKeyParse,
};
