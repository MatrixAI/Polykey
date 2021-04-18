import { ErrorPolykey } from '../errors';

class ErrorGestalts extends ErrorPolykey {}

class ErrorGestaltsGraphKeyRead extends ErrorGestalts {}

class ErrorGestaltsGraphKeyWrite extends ErrorGestalts {}

class ErrorGestaltsGraphKeyParse extends ErrorGestalts {}

class ErrorGestaltsGraphNotStarted extends ErrorGestalts {}

class ErrorGestaltsGraphValueDecrypt extends ErrorGestalts {}

class ErrorGestaltsGraphValueParse extends ErrorGestalts {}

export {
  ErrorGestalts,
  ErrorGestaltsGraphNotStarted,
  ErrorGestaltsGraphKeyRead,
  ErrorGestaltsGraphKeyWrite,
  ErrorGestaltsGraphKeyParse,
  ErrorGestaltsGraphValueDecrypt,
  ErrorGestaltsGraphValueParse,
};
