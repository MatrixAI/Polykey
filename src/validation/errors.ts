import { AbstractError } from '@matrixai/errors';
import { ErrorPolykey, sysexits } from '../errors';

/**
 * Generic error containing all parsing errors that occurred during
 * execution.
 */
class ErrorValidation<T> extends ErrorPolykey<T> {
  static description = 'Input data failed validation';
  exitCode = sysexits.DATAERR;
  public errors: Array<ErrorParse<T>>;
  constructor(message, data) {
    super(message, data);
    if (data.errors != null) {
      const errors: Array<ErrorParse<T>> = [];
      for (const eData of data.errors) {
        const errorParse = new ErrorParse<T>(eData.message);
        errorParse.keyPath = eData.keyPath;
        errorParse.value = eData.value;
        errorParse.context = eData.context;
        errors.push(errorParse);
      }
      this.errors = errors;
    }
  }

  /**
   * This packages an `ErrorParse` array into the `data` property
   * This is to allow encoding to and decoding from GRPC errors
   */
  static createFromErrors<T>(errors: Array<ErrorParse<T>>): ErrorValidation<T> {
    const message = errors.map((e) => e.message).join('; ');
    const data = {
      errors: errors.map((e) => ({
        message: e.message,
        keyPath: e.keyPath,
        value: e.value.valueOf(),
        context: e.context,
      })),
    };
    const e = new ErrorValidation<T>(message, data);
    e.errors = errors;
    return e;
  }
}

/**
 * Exception to be thrown during parsing failure
 * This is not part of the Polykey exception hierarchy
 * This is because it plain exception wrapper parsing error data
 * While JS allows us to throw POJOs directly, having a nominal type
 * is easier to check against
 */
class ErrorParse<T> extends AbstractError<T> {
  static description: string = 'Failed to parse data into valid format';
  public keyPath: Array<string>;
  public value: any;
  public context: object;
}

export { ErrorValidation, ErrorParse };
