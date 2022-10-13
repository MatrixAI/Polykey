import { ErrorPolykey, sysexits } from '../errors';

class ErrorKeys<T> extends ErrorPolykey<T> {}

class ErrorKeyRingRunning<T> extends ErrorKeys<T> {
  static description = 'KeyRing is running';
  exitCode = sysexits.USAGE;
}

class ErrorKeyRingNotRunning<T> extends ErrorKeys<T> {
  static description = 'KeyRing is not running';
  exitCode = sysexits.USAGE;
}

class ErrorKeyRingDestroyed<T> extends ErrorKeys<T> {
  static description = 'KeyRing is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorCertManagerRunning<T> extends ErrorKeys<T> {
  static description = 'CertManager is running';
  exitCode = sysexits.USAGE;
}

class ErrorCertManagerNotRunning<T> extends ErrorKeys<T> {
  static description = 'CertManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorCertManagerDestroyed<T> extends ErrorKeys<T> {
  static description = 'CertManager is destroyed';
  exitCode = sysexits.USAGE;
}

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

class ErrorKeysPrivateKeyInvalid<T> extends ErrorKeys<T> {
  static description = 'Private key has invalid format';
  exitCode = sysexits.USAGE;
}

class ErrorRootKeysRead<T> extends ErrorKeys<T> {
  static description = 'Unable to read root keypair';
  exitCode = sysexits.IOERR;
}

class ErrorRootKeysParse<T> extends ErrorKeys<T> {
  static description = 'Unable to parse root keypair';
  exitCode = sysexits.IOERR;
}

class ErrorRootKeysWrite<T> extends ErrorKeys<T> {
  static description = 'Unable to write root keypair';
  exitCode = sysexits.IOERR;
}

class ErrorRootKeysRotate<T> extends ErrorKeys<T> {
  static description = 'Unable to rotate root keypair';
  exitCode = sysexits.IOERR;
}

class ErrorDBKeyRead<T> extends ErrorKeys<T> {
  static description = 'Unable to read key';
  exitCode = sysexits.IOERR;
}

class ErrorDBKeyWrite<T> extends ErrorKeys<T> {
  static description = 'Unable to write key';
  exitCode = sysexits.IOERR;
}

class ErrorDBKeyParse<T> extends ErrorKeys<T> {
  static description = 'Unable to decrypt key';
  exitCode = sysexits.IOERR;
}

class ErrorCertsRenew<T> extends ErrorKeys<T> {
  static description = 'Unable to renew certificate chain';
  exitCode = sysexits.IOERR;
}

class ErrorCertsReset<T> extends ErrorKeys<T> {
  static description = 'Unable to reset certificate chain';
  exitCode = sysexits.IOERR;
}

class ErrorCertsGC<T> extends ErrorKeys<T> {
  static description = 'Unexpected error during certificate garbage collection';
  exitCode = sysexits.SOFTWARE;
}

class ErrorBufferLock<T> extends ErrorKeys<T> {
  static description = 'Unable to lock sensitive memory buffer';
  exitCode = sysexits.TEMPFAIL;
}

export {
  ErrorKeys,
  ErrorKeyRingRunning,
  ErrorKeyRingNotRunning,
  ErrorKeyRingDestroyed,
  ErrorCertManagerRunning,
  ErrorCertManagerNotRunning,
  ErrorCertManagerDestroyed,
  ErrorKeysPasswordInvalid,
  ErrorKeysRecoveryCodeInvalid,
  ErrorKeysRecoveryCodeIncorrect,
  ErrorKeysPrivateKeyInvalid,
  ErrorRootKeysRead,
  ErrorRootKeysParse,
  ErrorRootKeysWrite,
  ErrorRootKeysRotate,
  ErrorDBKeyRead,
  ErrorDBKeyWrite,
  ErrorDBKeyParse,
  ErrorCertsRenew,
  ErrorCertsReset,
  ErrorCertsGC,
  ErrorBufferLock,
};
