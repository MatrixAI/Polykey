import { ErrorPolykey } from '../errors';

class ErrorSession extends ErrorPolykey {}

class ErrorSessionManagerNotStarted extends ErrorSession {}

class ErrorSessionNotStarted extends ErrorSession {
  description: string = 'Client session not started, JWT token not claimed';
  exitCode: number = 77;
}

class ErrorReadingPrivateKey extends ErrorSession {}

class ErrorSessionJWTTokenInvalid extends ErrorSession {
  description: string = 'Invalid JWT Token, please reauthenticate.';
  exitCode: number = 65;
}

export {
  ErrorSession,
  ErrorSessionManagerNotStarted,
  ErrorSessionNotStarted,
  ErrorReadingPrivateKey,
  ErrorSessionJWTTokenInvalid,
};
