import { ErrorPolykey, sysexits } from '../errors';

class ErrorContexts<T> extends ErrorPolykey<T> {}

class ErrorContextsTimerExpired<T> extends ErrorContexts<T> {
  static description = 'Aborted due to timer expiration';
  exitCode = sysexits.UNAVAILABLE;
}

export {
  ErrorContexts,
  ErrorContextsTimerExpired
};
