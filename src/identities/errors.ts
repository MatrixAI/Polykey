import { ErrorPolykey } from '../errors';

class ErrorIdentities extends ErrorPolykey {}

class ErrorIdentitiesManagerRunning extends ErrorIdentities {}
class ErrorIdentitiesManagerNotRunning extends ErrorIdentities {}
class ErrorIdentitiesManagerDestroyed extends ErrorIdentities {}

class ErrorProviderDuplicate extends ErrorIdentities {}

class ErrorProviderCall extends ErrorIdentities {}

class ErrorProviderAuthentication extends ErrorIdentities {}

class ErrorProviderUnauthenticated extends ErrorIdentities {}

class ErrorProviderUnimplemented extends ErrorIdentities {}

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
};
