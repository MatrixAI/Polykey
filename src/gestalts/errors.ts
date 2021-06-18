import { ErrorPolykey } from '../errors';

class ErrorGestalts extends ErrorPolykey {}

class ErrorGestaltsGraphKeyRead extends ErrorGestalts {}

class ErrorGestaltsGraphKeyWrite extends ErrorGestalts {}

class ErrorGestaltsGraphKeyParse extends ErrorGestalts {}

class ErrorGestaltsGraphNotStarted extends ErrorGestalts {}

class ErrorGestaltsDecrypt extends ErrorGestalts {}

class ErrorGestaltsParse extends ErrorGestalts {}

export {
  ErrorGestalts,
  ErrorGestaltsGraphNotStarted,
  ErrorGestaltsGraphKeyRead,
  ErrorGestaltsGraphKeyWrite,
  ErrorGestaltsGraphKeyParse,
  ErrorGestaltsDecrypt,
  ErrorGestaltsParse,
};
