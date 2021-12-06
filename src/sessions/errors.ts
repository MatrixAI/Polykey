import { ErrorPolykey } from '../errors';

class ErrorSessions extends ErrorPolykey {}

class ErrorSessionRunning extends ErrorSessions {}

class ErrorSessionNotRunning extends ErrorSessions {}

class ErrorSessionDestroyed extends ErrorSessions {}

class ErrorSessionManagerRunning extends ErrorSessions {}

class ErrorSessionManagerNotRunning extends ErrorSessions {}

class ErrorSessionManagerDestroyed extends ErrorSessions {}

export {
  ErrorSessions,
  ErrorSessionRunning,
  ErrorSessionNotRunning,
  ErrorSessionDestroyed,
  ErrorSessionManagerRunning,
  ErrorSessionManagerNotRunning,
  ErrorSessionManagerDestroyed,
};
