import { ErrorPolykey, sysexits } from '../errors';

class ErrorStatus extends ErrorPolykey {}

class ErrorStatusNotRunning extends ErrorStatus {}

class ErrorStatusLocked extends ErrorStatus {
  decription = 'Status is locked by another process';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorStatusRead extends ErrorStatus {
  decription = 'Failed to read status info';
  exitCode = sysexits.IOERR;
}

class ErrorStatusWrite extends ErrorStatus {
  decription = 'Failed to write status info';
  exitCode = sysexits.IOERR;
}

class ErrorStatusParse extends ErrorStatus {
  decription = 'Failed to parse status info';
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
