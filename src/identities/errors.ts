import { ErrorPolykey, sysexits } from '../errors';

class ErrorIdentities<T> extends ErrorPolykey<T> {}

class ErrorIdentitiesManagerRunning<T> extends ErrorIdentities<T> {
  static description = 'IdentitiesManager is running';
  exitCode = sysexits.USAGE;
}

class ErrorIdentitiesManagerNotRunning<T> extends ErrorIdentities<T> {
  static description = 'IdentitiesManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorIdentitiesManagerDestroyed<T> extends ErrorIdentities<T> {
  static description = 'IdentitiesManager is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorProviderDuplicate<T> extends ErrorIdentities<T> {
  static description = 'Provider has already been registered';
  exitCode = sysexits.USAGE;
}

class ErrorProviderCall<T> extends ErrorIdentities<T> {
  static description = 'Invalid response received from provider';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorProviderAuthentication<T> extends ErrorIdentities<T> {
  static description = 'Could not authenticate provider';
  exitCode = sysexits.UNKNOWN;
}

class ErrorProviderUnauthenticated<T> extends ErrorIdentities<T> {
  static description =
    'Provider has not been authenticated or access token is expired or invalid';
  exitCode = sysexits.NOPERM;
}

class ErrorProviderIdentityMissing<T> extends ErrorIdentities<T> {
  static description = 'Identity is not authenticated with the provider';
  exitCode = sysexits.NOPERM;
}

class ErrorProviderUnimplemented<T> extends ErrorIdentities<T> {
  static description = 'Functionality is unavailable';
  exitCode = sysexits.USAGE;
}

class ErrorProviderMissing<T> extends ErrorIdentities<T> {
  static description = 'Provider has not been registered';
  exitCode = sysexits.USAGE;
}

export {
  ErrorIdentities,
  ErrorIdentitiesManagerRunning,
  ErrorIdentitiesManagerNotRunning,
  ErrorIdentitiesManagerDestroyed,
  ErrorProviderDuplicate,
  ErrorProviderCall,
  ErrorProviderAuthentication,
  ErrorProviderUnauthenticated,
  ErrorProviderUnimplemented,
  ErrorProviderIdentityMissing,
  ErrorProviderMissing,
};
