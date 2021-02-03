import { ErrorPolykey } from '../errors';

class ErrorProvider extends ErrorPolykey {};

class ErrorProviderCall extends ErrorProvider {};

class ErrorProviderUnimplemented extends ErrorProvider {};

class ErrorProviderAuthentication extends ErrorProvider {};

class ErrorProviderUnauthenticated extends ErrorProvider {};

export {
  ErrorProvider,
  ErrorProviderCall,
  ErrorProviderUnimplemented,
  ErrorProviderAuthentication,
  ErrorProviderUnauthenticated
};
