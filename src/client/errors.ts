import { ErrorPolykey } from '../errors';

class ErrorClient extends ErrorPolykey {}

class ErrorClientClientNotStarted extends ErrorClient {}

class ErrorClientPasswordNotProvided extends ErrorClient {
  description: string =
    'Password file is required to access PolyKey, use --password-file <file>';
  exitCode: number = 64;
}

export {
  ErrorClient,
  ErrorClientClientNotStarted,
  ErrorClientPasswordNotProvided,
};
