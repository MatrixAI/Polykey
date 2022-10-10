import { ErrorPolykey, sysexits } from '../errors';

class ErrorKeys<T> extends ErrorPolykey<T> {}

class ErrorKeyManagerRunning<T> extends ErrorKeys<T> {
  static description = 'KeyManager is running';
  exitCode = sysexits.USAGE;
}

class ErrorKeyManagerNotRunning<T> extends ErrorKeys<T> {
  static description = 'KeyManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorKeyManagerDestroyed<T> extends ErrorKeys<T> {
  static description = 'KeyManager is destroyed';
  exitCode = sysexits.USAGE;
}

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

class ErrorRootCertRead<T> extends ErrorKeys<T> {
  static description = 'Unable to read root certificate';
  exitCode = sysexits.IOERR;
}

class ErrorRootCertWrite<T> extends ErrorKeys<T> {
  static description = 'Unable to write root certificate';
  exitCode = sysexits.IOERR;
}

class ErrorRootCertRenew<T> extends ErrorKeys<T> {
  static description = 'Unable to renew root certificate';
  exitCode = sysexits.IOERR;
}

class ErrorRootCertsGC<T> extends ErrorKeys<T> {
  static description = 'Unexpected error during garbage collection';
  exitCode = sysexits.IOERR;
}

class ErrorEncryptSize<T> extends ErrorKeys<T> {
  static description = 'Cannot encrypt data with key bit size';
  exitCode = sysexits.USAGE;
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

class ErrorBufferLock<T> extends ErrorKeys<T> {
  static description = 'Unable to lock sensitive memory buffer';
  exitCode = sysexits.TEMPFAIL;
}

export {
  ErrorKeys,
  ErrorKeyManagerRunning,
  ErrorKeyManagerNotRunning,
  ErrorKeyManagerDestroyed,
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
  ErrorRootCertRead,
  ErrorRootCertWrite,
  ErrorRootCertRenew,
  ErrorRootCertsGC,
  ErrorEncryptSize,
  ErrorDBKeyRead,
  ErrorDBKeyWrite,
  ErrorDBKeyParse,
  ErrorBufferLock,
};
