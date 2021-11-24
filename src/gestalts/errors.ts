import { ErrorPolykey } from '../errors';

class ErrorGestalts extends ErrorPolykey {}

class ErrorGestaltsGraphRunning extends ErrorGestalts {}

class ErrorGestaltsGraphNotRunning extends ErrorGestalts {}

class ErrorGestaltsGraphDestroyed extends ErrorGestalts {}

class ErrorGestaltsGraphNodeIdMissing extends ErrorGestalts {}

class ErrorGestaltsGraphIdentityIdMissing extends ErrorGestalts {}

class ErrorGestaltsInvalidAction extends ErrorGestalts {}

export {
  ErrorGestalts,
  ErrorGestaltsGraphRunning,
  ErrorGestaltsGraphNotRunning,
  ErrorGestaltsGraphDestroyed,
  ErrorGestaltsGraphNodeIdMissing,
  ErrorGestaltsGraphIdentityIdMissing,
  ErrorGestaltsInvalidAction,
};
