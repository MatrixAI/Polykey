import { ErrorPolykey, sysexits } from '../errors';

class ErrorGestalts<T> extends ErrorPolykey<T> {}

class ErrorGestaltsGraphRunning<T> extends ErrorGestalts<T> {
  static description = 'GestaltGraph is running';
  exitCode = sysexits.USAGE;
}

class ErrorGestaltsGraphNotRunning<T> extends ErrorGestalts<T> {
  static description = 'GestaltGraph is not running';
  exitCode = sysexits.USAGE;
}

class ErrorGestaltsGraphDestroyed<T> extends ErrorGestalts<T> {
  static description = 'GestaltGraph is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorGestaltsGraphNodeIdMissing<T> extends ErrorGestalts<T> {
  static description = 'Could not find NodeId';
  exitCode = sysexits.NOUSER;
}

class ErrorGestaltsGraphIdentityIdMissing<T> extends ErrorGestalts<T> {
  static description = 'Could not find IdentityId';
  exitCode = sysexits.NOUSER;
}

export {
  ErrorGestalts,
  ErrorGestaltsGraphRunning,
  ErrorGestaltsGraphNotRunning,
  ErrorGestaltsGraphDestroyed,
  ErrorGestaltsGraphNodeIdMissing,
  ErrorGestaltsGraphIdentityIdMissing,
};
