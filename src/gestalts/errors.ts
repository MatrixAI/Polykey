import { ErrorPolykey } from '../errors';

class ErrorGestalts<T> extends ErrorPolykey<T> {}

class ErrorGestaltsGraphRunning<T> extends ErrorGestalts<T> {}

class ErrorGestaltsGraphNotRunning<T> extends ErrorGestalts<T> {}

class ErrorGestaltsGraphDestroyed<T> extends ErrorGestalts<T> {}

class ErrorGestaltsGraphNodeIdMissing<T> extends ErrorGestalts<T> {}

class ErrorGestaltsGraphIdentityIdMissing<T> extends ErrorGestalts<T> {}

export {
  ErrorGestalts,
  ErrorGestaltsGraphRunning,
  ErrorGestaltsGraphNotRunning,
  ErrorGestaltsGraphDestroyed,
  ErrorGestaltsGraphNodeIdMissing,
  ErrorGestaltsGraphIdentityIdMissing,
};
