import { ErrorPolykey } from '../errors';

class ErrorDB extends ErrorPolykey {}

class ErrorDBNotStarted extends ErrorDB {}

class ErrorDBDecrypt extends ErrorDB {}

class ErrorDBParse extends ErrorDB {}

export { ErrorDB, ErrorDBNotStarted, ErrorDBDecrypt, ErrorDBParse };
