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

class ErrorGestaltsGraphLinkNodeMatch<T> extends ErrorGestalts<T> {
  static description = 'Link node signed claim does not have matching `iss` and `sub` node IDs';
  exitCode = sysexits.USAGE;
}

class ErrorGestaltsGraphLinkIdentityMatch<T> extends ErrorGestalts<T> {
  static description = 'Link identity signed claim does not have matching `iss` and `sub` node and identity IDs';
  exitCode = sysexits.USAGE;
}

export {
  ErrorGestalts,
  ErrorGestaltsGraphRunning,
  ErrorGestaltsGraphNotRunning,
  ErrorGestaltsGraphDestroyed,
  ErrorGestaltsGraphNodeIdMissing,
  ErrorGestaltsGraphIdentityIdMissing,
  ErrorGestaltsGraphLinkNodeMatch,
  ErrorGestaltsGraphLinkIdentityMatch,
};
