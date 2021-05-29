import { ErrorPolykey } from '../errors';

class ErrorClient extends ErrorPolykey {}

class ErrorClientClientNotStarted extends ErrorClient {}

class ErrorClientPasswordNotProvided extends ErrorClient {}

export {
  ErrorClient,
  ErrorClientClientNotStarted,
  ErrorClientPasswordNotProvided,
};
