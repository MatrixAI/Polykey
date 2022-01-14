import { ErrorPolykey, sysexits } from '../errors';

class ErrorStatus extends ErrorPolykey {}

class ErrorStatusNotRunning extends ErrorStatus {}

class ErrorStatusLocked extends ErrorStatus {
  description = 'Status is locked by another process';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorStatusRead extends ErrorStatus {
  description = 'Failed to read status info';
  exitCode = sysexits.IOERR;
}

class ErrorStatusWrite extends ErrorStatus {
  description = 'Failed to write status info';
  exitCode = sysexits.IOERR;
}

class ErrorStatusLiveUpdate extends ErrorStatus {
  description = 'Failed to update LIVE status info';
  exitCode = sysexits.USAGE;
}

class ErrorStatusParse extends ErrorStatus {
  description = 'Failed to parse status info';
  exitCode = sysexits.CONFIG;
}

class ErrorStatusTimeout extends ErrorStatus {
  description = 'Poll timed out';
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
