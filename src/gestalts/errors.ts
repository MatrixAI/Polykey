import { ErrorPolykey } from '../errors';

class ErrorGestalts extends ErrorPolykey {}

class ErrorGestaltsGraphDestroyed extends ErrorGestalts {}

class ErrorGestaltsGraphNodeIdMissing extends ErrorGestalts {}

class ErrorGestaltsGraphIdentityIdMissing extends ErrorGestalts {}

class ErrorGestaltsInvalidAction extends ErrorGestalts {}

export {
  ErrorGestalts,
  ErrorGestaltsGraphDestroyed,
  ErrorGestaltsGraphNodeIdMissing,
  ErrorGestaltsGraphIdentityIdMissing,
  ErrorGestaltsInvalidAction,
};
