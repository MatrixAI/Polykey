import { ErrorPolykey, sysexits } from '../errors';

class ErrorClient extends ErrorPolykey {}

class ErrorClientClientDestroyed extends ErrorClient {
  description = 'GRPCClientClient has been destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorClientAuthMissing extends ErrorClient {
  description = 'Authorisation metadata is required but missing';
  exitCode = sysexits.NOPERM;
}

class ErrorClientAuthFormat extends ErrorClient {
  description = 'Authorisation metadata has invalid format';
  exitCode = sysexits.USAGE;
}

class ErrorClientAuthDenied extends ErrorClient {
  description = 'Authorisation metadata is incorrect or expired';
  exitCode = sysexits.NOPERM;
}

export {
  ErrorClient,
  ErrorClientClientDestroyed,
  ErrorClientAuthMissing,
  ErrorClientAuthFormat,
  ErrorClientAuthDenied,
};
