import ErrorPolykey from '../ErrorPolykey.js';
import sysexits from '../utils/sysexits.js';

class ErrorClient<T> extends ErrorPolykey<T> {}

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

class ErrorClientInvalidHeader<T> extends ErrorClient<T> {
  static description = 'The header message does not match the expected type';
  exitCode = sysexits.USAGE;
}

class ErrorClientProtocolError<T> extends ErrorClient<T> {
  static description = 'Data does not match the protocol requirements';
  exitCode = sysexits.USAGE;
}

class ErrorClientService<T> extends ErrorClient<T> {}

class ErrorClientServiceRunning<T> extends ErrorClientService<T> {
  static description = 'ClientService is running';
  exitCode = sysexits.USAGE;
}

class ErrorClientServiceNotRunning<T> extends ErrorClientService<T> {
  static description = 'ClientService is not running';
  exitCode = sysexits.USAGE;
}

class ErrorClientServiceDestroyed<T> extends ErrorClientService<T> {
  static description = 'ClientService is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorClientVerificationFailed<T> extends ErrorClientService<T> {
  static description = 'ClientService is destroyed';
  exitCode = sysexits.USAGE;
}

export {
  ErrorClient,
  ErrorClientAuthMissing,
  ErrorClientAuthFormat,
  ErrorClientAuthDenied,
  ErrorClientInvalidHeader,
  ErrorClientProtocolError,
  ErrorClientService,
  ErrorClientServiceRunning,
  ErrorClientServiceNotRunning,
  ErrorClientServiceDestroyed,
  ErrorClientVerificationFailed,
};
