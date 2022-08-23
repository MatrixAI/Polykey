import { ErrorPolykey, sysexits } from '../errors';

class ErrorTimer<T> extends ErrorPolykey<T> {}

class ErrorTimerCancelled<T> extends ErrorTimer<T> {
  static description = 'Timer is cancelled';
  exitCode = sysexits.USAGE;
}

export { ErrorTimer, ErrorTimerCancelled };
