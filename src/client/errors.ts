import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

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
  ErrorClientService,
  ErrorClientServiceRunning,
  ErrorClientServiceNotRunning,
  ErrorClientServiceDestroyed,
  ErrorClientVerificationFailed,
};
