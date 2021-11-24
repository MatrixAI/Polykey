import { ErrorPolykey } from '../errors';

class ErrorSession extends ErrorPolykey {}

class ErrorSessionRunning extends ErrorSession {}

class ErrorSessionNotRunning extends ErrorSession {}

class ErrorSessionDestroyed extends ErrorSession {}

class ErrorSessionManagerRunning extends ErrorSession {}

class ErrorSessionManagerNotRunning extends ErrorSession {}

class ErrorSessionManagerDestroyed extends ErrorSession {}

export {
  ErrorSession,
  ErrorSessionRunning,
  ErrorSessionNotRunning,
  ErrorSessionDestroyed,
  ErrorSessionManagerRunning,
  ErrorSessionManagerNotRunning,
  ErrorSessionManagerDestroyed,
};
