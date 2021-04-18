import { ErrorPolykey } from '../errors';

class ErrorIdentities extends ErrorPolykey {}

class ErrorIdentitiesManagerNotStarted extends ErrorIdentities {}

class ErrorIdentitiesTokenValueDecrypt extends ErrorIdentities {}

class ErrorIdentitiesTokenValueParse extends ErrorIdentities {}

class ErrorProviderDuplicate extends ErrorIdentities {}

class ErrorProviderCall extends ErrorIdentities {}

class ErrorProviderAuthentication extends ErrorIdentities {}

class ErrorProviderUnauthenticated extends ErrorIdentities {}

class ErrorProviderUnimplemented extends ErrorIdentities {}

export {
  ErrorIdentities,
  ErrorIdentitiesManagerNotStarted,
  ErrorIdentitiesTokenValueDecrypt,
  ErrorIdentitiesTokenValueParse,
  ErrorProviderDuplicate,
  ErrorProviderCall,
  ErrorProviderAuthentication,
  ErrorProviderUnauthenticated,
  ErrorProviderUnimplemented,
};
