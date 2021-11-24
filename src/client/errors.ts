import { ErrorPolykey } from '../errors';

class ErrorClient extends ErrorPolykey {}

class ErrorClientClientDestroyed extends ErrorClient {
  description = 'GRPCClientClient has been destroyed';
  exitCode = 64;
}

class ErrorClientAuthMissing extends ErrorClient {
  description = 'Authorisation metadata is required but missing';
  exitCode = 77;
}

class ErrorClientAuthFormat extends ErrorClient {
  description = 'Authorisation metadata has invalid format';
  exitCode = 64;
}

class ErrorClientAuthDenied extends ErrorClient {
  description = 'Authorisation metadata is incorrect or expired';
  exitCode = 77;
}

class ErrorClientInvalidNode extends ErrorClient {
  exitCode: number = 70;
}

export {
  ErrorClient,
  ErrorClientClientDestroyed,
  ErrorClientAuthMissing,
  ErrorClientAuthFormat,
  ErrorClientAuthDenied,
  ErrorClientInvalidNode,
};
