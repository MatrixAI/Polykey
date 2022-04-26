import { ErrorPolykey } from '../errors';

class ErrorIdentities<T> extends ErrorPolykey<T> {}

class ErrorIdentitiesManagerRunning<T> extends ErrorIdentities<T> {}

class ErrorIdentitiesManagerNotRunning<T> extends ErrorIdentities<T> {}

class ErrorIdentitiesManagerDestroyed<T> extends ErrorIdentities<T> {}

class ErrorProviderDuplicate<T> extends ErrorIdentities<T> {}

class ErrorProviderCall<T> extends ErrorIdentities<T> {}

class ErrorProviderAuthentication<T> extends ErrorIdentities<T> {}

class ErrorProviderUnauthenticated<T> extends ErrorIdentities<T> {}

class ErrorProviderUnimplemented<T> extends ErrorIdentities<T> {}

class ErrorProviderMissing<T> extends ErrorIdentities<T> {}

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
  ErrorProviderMissing,
};
