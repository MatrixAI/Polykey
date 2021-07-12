import { ErrorPolykey } from '../errors';

class ErrorIdentities extends ErrorPolykey {}

class ErrorIdentitiesManagerNotStarted extends ErrorIdentities {}

class ErrorProviderDuplicate extends ErrorIdentities {}

class ErrorProviderCall extends ErrorIdentities {}

class ErrorProviderAuthentication extends ErrorIdentities {}

class ErrorProviderUnauthenticated extends ErrorIdentities {}

class ErrorProviderUnimplemented extends ErrorIdentities {}

export {
  ErrorIdentities,
  ErrorIdentitiesManagerNotStarted,
  ErrorProviderDuplicate,
  ErrorProviderCall,
  ErrorProviderAuthentication,
  ErrorProviderUnauthenticated,
  ErrorProviderUnimplemented,
};
