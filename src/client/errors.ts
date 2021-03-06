import { ErrorPolykey, sysexits } from '../errors';

class ErrorClient<T> extends ErrorPolykey<T> {}

class ErrorClientClientDestroyed<T> extends ErrorClient<T> {
  static description = 'GRPCClientClient has been destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorClientAuthMissing<T> extends ErrorClient<T> {
  static description = 'Authorisation metadata is required but missing';
  exitCode = sysexits.NOPERM;
}

class ErrorClientAuthFormat<T> extends ErrorClient<T> {
  static description = 'Authorisation metadata has invalid format';
  exitCode = sysexits.USAGE;
}

class ErrorClientAuthDenied<T> extends ErrorClient<T> {
  static description = 'Authorisation metadata is incorrect or expired';
  exitCode = sysexits.NOPERM;
}

export {
  ErrorClient,
  ErrorClientClientDestroyed,
  ErrorClientAuthMissing,
  ErrorClientAuthFormat,
  ErrorClientAuthDenied,
};
