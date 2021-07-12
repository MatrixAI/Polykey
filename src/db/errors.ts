import { ErrorPolykey } from '../errors';

class ErrorDB extends ErrorPolykey {}

class ErrorDBNotStarted extends ErrorDB {}

class ErrorDBDecrypt extends ErrorDB {}

class ErrorDBParse extends ErrorDB {}

class ErrorDBKeyRead extends ErrorDB {}

class ErrorDBKeyWrite extends ErrorDB {}

class ErrorDBKeyParse extends ErrorDB {}

export {
  ErrorDB,
  ErrorDBNotStarted,
  ErrorDBDecrypt,
  ErrorDBParse,
  ErrorDBKeyRead,
  ErrorDBKeyWrite,
  ErrorDBKeyParse,
};
