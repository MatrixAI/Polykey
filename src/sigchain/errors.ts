import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

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

export {
  ErrorSigchainRunning,
  ErrorSigchainNotRunning,
  ErrorSigchainDestroyed,
};
