import { ErrorPolykey, sysexits } from '../errors';

class ErrorAgent<T> extends ErrorPolykey<T> {}

class ErrorConnectionInfoMissing<T> extends ErrorAgent<T> {
  static description = 'Connection info was missing from connection metadata';
  exitCode = sysexits.UNAVAILABLE;
}

export { ErrorConnectionInfoMissing };
