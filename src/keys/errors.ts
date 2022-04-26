import { ErrorPolykey, sysexits } from '../errors';

class ErrorKeys<T> extends ErrorPolykey<T> {}

class ErrorKeyManagerRunning<T> extends ErrorKeys<T> {}

class ErrorKeyManagerNotRunning<T> extends ErrorKeys<T> {}

class ErrorKeyManagerDestroyed<T> extends ErrorKeys<T> {}

class ErrorKeysPasswordInvalid<T> extends ErrorKeys<T> {
  static description = 'Password has invalid format';
  exitCode = sysexits.USAGE;
}

class ErrorKeysRecoveryCodeInvalid<T> extends ErrorKeys<T> {
  static description = 'Recovery code has invalid format';
  exitCode = sysexits.USAGE;
}

class ErrorKeysRecoveryCodeIncorrect<T> extends ErrorKeys<T> {
  static description =
    "Recovered key pair's public key does not match the root public key";
  exitCode = sysexits.USAGE;
}

class ErrorRootKeysRead<T> extends ErrorKeys<T> {}

class ErrorRootKeysParse<T> extends ErrorKeys<T> {}

class ErrorRootKeysWrite<T> extends ErrorKeys<T> {}

class ErrorRootCertRead<T> extends ErrorKeys<T> {}

class ErrorRootCertWrite<T> extends ErrorKeys<T> {}

class ErrorRootCertRenew<T> extends ErrorKeys<T> {}

class ErrorRootCertsGC<T> extends ErrorKeys<T> {}

class ErrorEncryptSize<T> extends ErrorKeys<T> {}

class ErrorDBKeyRead<T> extends ErrorKeys<T> {}

class ErrorDBKeyWrite<T> extends ErrorKeys<T> {}

class ErrorDBKeyParse<T> extends ErrorKeys<T> {}

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
