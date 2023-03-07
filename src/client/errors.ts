import { ErrorPolykey, sysexits } from '../errors';

class ErrorRPC<T> extends ErrorPolykey<T> {}

class ErrorRPCClient<T> extends ErrorRPC<T> {}

class ErrorClientAuthMissing<T> extends ErrorRPCClient<T> {
  static description = 'Authorisation metadata is required but missing';
  exitCode = sysexits.NOPERM;
}

class ErrorClientAuthFormat<T> extends ErrorRPCClient<T> {
  static description = 'Authorisation metadata has invalid format';
  exitCode = sysexits.USAGE;
}

class ErrorClientAuthDenied<T> extends ErrorRPCClient<T> {
  static description = 'Authorisation metadata is incorrect or expired';
  exitCode = sysexits.NOPERM;
}

export {
  ErrorRPC,
  ErrorRPCClient,
  ErrorClientAuthMissing,
  ErrorClientAuthFormat,
  ErrorClientAuthDenied,
};
