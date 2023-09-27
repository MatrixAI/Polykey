import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorSessions<T> extends ErrorPolykey<T> {}

class ErrorSessionRunning<T> extends ErrorSessions<T> {
  static description = 'Session is running';
  exitCode = sysexits.USAGE;
}

class ErrorSessionNotRunning<T> extends ErrorSessions<T> {
  static description = 'Session is not running';
  exitCode = sysexits.USAGE;
}

class ErrorSessionDestroyed<T> extends ErrorSessions<T> {
  static description = 'Session is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorSessionManagerRunning<T> extends ErrorSessions<T> {
  static description = 'SessionManager is running';
  exitCode = sysexits.USAGE;
}

class ErrorSessionManagerNotRunning<T> extends ErrorSessions<T> {
  static description = 'SessionManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorSessionManagerDestroyed<T> extends ErrorSessions<T> {
  static description = 'SessionManager is destroyed';
  exitCode = sysexits.USAGE;
}

export {
  ErrorSessions,
  ErrorSessionRunning,
  ErrorSessionNotRunning,
  ErrorSessionDestroyed,
  ErrorSessionManagerRunning,
  ErrorSessionManagerNotRunning,
  ErrorSessionManagerDestroyed,
};
