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

class ErrorKeysRecoveryCodeIncorrect<T> extends ErrorKeys<T> {
  static description =
    "Recovered key pair's public key does not match the root public key";
  exitCode = sysexits.USAGE;
}

class ErrorKeyPairRead<T> extends ErrorKeys<T> {
  static description = 'Unable to read root keypair';
  exitCode = sysexits.IOERR;
}

class ErrorKeyPairParse<T> extends ErrorKeys<T> {
  static description = 'Unable to parse root keypair';
  exitCode = sysexits.IOERR;
}

class ErrorKeyPairWrite<T> extends ErrorKeys<T> {
  static description = 'Unable to write root keypair';
  exitCode = sysexits.IOERR;
}

class ErrorKeyPairRotate<T> extends ErrorKeys<T> {
  static description = 'Unable to rotate root keypair';
  exitCode = sysexits.IOERR;
}

class ErrorPublicKeyParse<T> extends ErrorKeys<T> {
  static description = 'Unable to parse public key';
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
  ErrorKeysRecoveryCodeIncorrect,
  ErrorKeyPairRead,
  ErrorKeyPairParse,
  ErrorKeyPairWrite,
  ErrorKeyPairRotate,
  ErrorPublicKeyParse,
  ErrorDBKeyRead,
  ErrorDBKeyWrite,
  ErrorDBKeyParse,
  ErrorCertsRenew,
  ErrorCertsReset,
  ErrorCertsGC,
  ErrorBufferLock,
};
