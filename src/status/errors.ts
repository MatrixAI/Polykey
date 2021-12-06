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

class ErrorStatusParse extends ErrorStatus {
  description = 'Failed to parse status info';
  exitCode = sysexits.CONFIG;
}

export {
  ErrorStatus,
  ErrorStatusNotRunning,
  ErrorStatusLocked,
  ErrorStatusRead,
  ErrorStatusWrite,
  ErrorStatusParse,
};
