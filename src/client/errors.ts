import { ErrorPolykey } from '../errors';

class ErrorClient extends ErrorPolykey {}

class ErrorClientClientNotStarted extends ErrorClient {
  description: string =
    'Polykey Lockfile not found. Is the PolykeyAgent started?';
  exitCode: number = 64;
}

class ErrorClientPasswordNotProvided extends ErrorClient {
  description: string =
    'Invalid Password, please use --password-file <file> or the prompt to input the correct password';
  exitCode: number = 64;
}

class ErrorClientJWTTokenNotProvided extends ErrorClient {
  description: string = 'JWT Token not provided in metadata';
  exitCode: number = 77;
}

class ErrorPassword extends ErrorClient {}

export {
  ErrorClient,
  ErrorClientClientNotStarted,
  ErrorClientPasswordNotProvided,
  ErrorClientJWTTokenNotProvided,
  ErrorPassword,
};
