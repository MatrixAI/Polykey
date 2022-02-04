import { CustomError } from 'ts-custom-error';
import { ErrorPolykey, sysexits } from '../errors';

/**
 * This packages the `ErrorParse` array into the `data` property
 * This is to allow encoding to and decoding from GRPC errors
 */
class ErrorValidation extends ErrorPolykey {
  public readonly errors: Array<ErrorParse>;
  constructor(errors: Array<ErrorParse>) {
    const message = errors.map((e) => e.message).join('; ');
    const data = {
      errors: errors.map((e) => ({
        message: e.message,
        keyPath: e.keyPath,
        value: e.value.valueOf(),
      })),
    };
    super(message, data);
    this.description = 'Input data failed validation';
    this.exitCode = sysexits.DATAERR;
    this.errors = errors;
  }
}

/**
 * Exception to be thrown during parsing failure
 * This is not part of the Polykey exception hierarchy
 * This is because it plain exception wrapper parsing error data
 * While JS allows us to throw POJOs directly, having a nominal type
 * is easier to check against
 */
class ErrorParse extends CustomError {
  public keyPath: Array<string>;
  public value: any;
  public context: object;
  constructor(message?: string) {
    super(message);
  }
}

export { ErrorValidation, ErrorParse };
