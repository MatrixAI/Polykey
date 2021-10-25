import { ErrorPolykey } from '../errors';

class ErrorIdentities extends ErrorPolykey {}

class ErrorIdentitiesManagerDestroyed extends ErrorIdentities {}

class ErrorProviderDuplicate extends ErrorIdentities {}

class ErrorProviderCall extends ErrorIdentities {}

class ErrorProviderAuthentication extends ErrorIdentities {}

class ErrorProviderUnauthenticated extends ErrorIdentities {}

class ErrorProviderUnimplemented extends ErrorIdentities {}

export {
  ErrorIdentities,
  ErrorIdentitiesManagerDestroyed,
  ErrorProviderDuplicate,
  ErrorProviderCall,
  ErrorProviderAuthentication,
  ErrorProviderUnauthenticated,
  ErrorProviderUnimplemented,
};
