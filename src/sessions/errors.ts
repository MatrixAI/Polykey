import { ErrorPolykey } from '../errors';

class ErrorSessions<T> extends ErrorPolykey<T> {}

class ErrorSessionRunning<T> extends ErrorSessions<T> {}

class ErrorSessionNotRunning<T> extends ErrorSessions<T> {}

class ErrorSessionDestroyed<T> extends ErrorSessions<T> {}

class ErrorSessionManagerRunning<T> extends ErrorSessions<T> {}

class ErrorSessionManagerNotRunning<T> extends ErrorSessions<T> {}

class ErrorSessionManagerDestroyed<T> extends ErrorSessions<T> {}

export {
  ErrorSessions,
  ErrorSessionRunning,
  ErrorSessionNotRunning,
  ErrorSessionDestroyed,
  ErrorSessionManagerRunning,
  ErrorSessionManagerNotRunning,
  ErrorSessionManagerDestroyed,
};
