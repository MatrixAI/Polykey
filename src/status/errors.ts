import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorStatus<T> extends ErrorPolykey<T> {}

class ErrorStatusNotRunning<T> extends ErrorStatus<T> {
  static description = 'Status is not running';
  exitCode = sysexits.USAGE;
}

class ErrorStatusLocked<T> extends ErrorStatus<T> {
  static description = 'Status is locked by another process';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorStatusRead<T> extends ErrorStatus<T> {
  static description = 'Failed to read status info';
  exitCode = sysexits.IOERR;
}

class ErrorStatusWrite<T> extends ErrorStatus<T> {
  static description = 'Failed to write status info';
  exitCode = sysexits.IOERR;
}

class ErrorStatusLiveUpdate<T> extends ErrorStatus<T> {
  static description = 'Failed to update LIVE status info';
  exitCode = sysexits.USAGE;
}

class ErrorStatusParse<T> extends ErrorStatus<T> {
  static description = 'Failed to parse status info';
  exitCode = sysexits.CONFIG;
}

class ErrorStatusTimeout<T> extends ErrorStatus<T> {
  static description = 'Poll timed out';
  exitCode = sysexits.TEMPFAIL;
}

export {
  ErrorStatus,
  ErrorStatusNotRunning,
  ErrorStatusLocked,
  ErrorStatusRead,
  ErrorStatusWrite,
  ErrorStatusLiveUpdate,
  ErrorStatusParse,
  ErrorStatusTimeout,
};
