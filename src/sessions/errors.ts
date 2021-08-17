import { ErrorPolykey } from '../errors';

class ErrorSession extends ErrorPolykey {}

class ErrorSessionManagerNotStarted extends ErrorSession {}

class ErrorSessionNotStarted extends ErrorSession {
  description: string = 'Client session not started, JWT token not claimed';
  exitCode: number = 77;
}

class ErrorReadingPrivateKey extends ErrorSession {}

class ErrorSessionTokenInvalid extends ErrorSession {
  description: string = 'Invalid JWT Token, please reauthenticate.';
  exitCode: number = 65;
}

class ErrorSessionTokenNotFound extends ErrorSession {
  description: string = 'Token not found or provided';
}

export {
  ErrorSession,
  ErrorSessionManagerNotStarted,
  ErrorSessionNotStarted,
  ErrorReadingPrivateKey,
  ErrorSessionTokenInvalid,
  ErrorSessionTokenNotFound,
};
