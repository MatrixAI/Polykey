import { ErrorPolykey, sysexits } from '../errors';

class ErrorSigchain<T> extends ErrorPolykey<T> {}

class ErrorSigchainRunning<T> extends ErrorSigchain<T> {
  static description = 'Sigchain is running';
  exitCode = sysexits.USAGE;
}

class ErrorSigchainNotRunning<T> extends ErrorSigchain<T> {
  static description = 'Sigchain is not running';
  exitCode = sysexits.USAGE;
}

class ErrorSigchainDestroyed<T> extends ErrorSigchain<T> {
  static description = 'Sigchain is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorSigchainSequenceNumUndefined<T> extends ErrorSigchain<T> {
  static description = 'Invalid database state';
  exitCode = sysexits.IOERR;
}

// class ErrorSigchainClaimUndefined<T> extends ErrorSigchain<T> {
//   static description = 'Could not retrieve claim';
//   exitCode = sysexits.USAGE;
// }

class ErrorSigchainInvalidSequenceNum<T> extends ErrorSigchain<T> {
  static description = 'Claim has invalid sequence number';
  exitCode = sysexits.USAGE;
}

class ErrorSigchainInvalidHash<T> extends ErrorSigchain<T> {
  static description = 'Claim has invalid hash';
  exitCode = sysexits.USAGE;
}

class ErrorSigchainDecrypt<T> extends ErrorSigchain<T> {}

class ErrorSigchainParse<T> extends ErrorSigchain<T> {}

export {
  ErrorSigchainRunning,
  ErrorSigchainNotRunning,
  ErrorSigchainDestroyed,
  ErrorSigchainSequenceNumUndefined,
  // ErrorSigchainClaimUndefined,
  ErrorSigchainInvalidSequenceNum,
  ErrorSigchainInvalidHash,
  ErrorSigchainDecrypt,
  ErrorSigchainParse,
};
