import { ErrorPolykey } from '../errors';

class ErrorSession extends ErrorPolykey {}

class ErrorSessionManagerNotStarted extends ErrorSession {}

class ErrorSessionNotStarted extends ErrorSession {}

class ErrorPassword extends ErrorSession {}

class ErrorReadingPrivateKey extends ErrorSession {}

export {
  ErrorSession,
  ErrorSessionManagerNotStarted,
  ErrorSessionNotStarted,
  ErrorPassword,
  ErrorReadingPrivateKey,
};
