import { AbstractError } from '@matrixai/errors';
import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

/**
 * Generic error containing all parsing errors that occurred during
 * execution.
 */
class ErrorValidation extends ErrorPolykey<void> {
  static description = 'Input data failed validation';
  exitCode = sysexits.DATAERR;
  public errors: Array<ErrorParse>;
  constructor(message, data) {
    super(message, data);
    if (data.errors != null) {
      const errors: Array<ErrorParse> = [];
      for (const eData of data.errors) {
        const errorParse = new ErrorParse(eData.message);
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
   * This is to allow encoding to and decoding from RPC errors
   */
  static createFromErrors(errors: Array<ErrorParse>): ErrorValidation {
    const message = errors.map((e) => e.message).join('; ');
    const data = {
      errors: errors.map((e) => ({
        message: e.message,
        keyPath: e.keyPath,
        value: e.value.valueOf(),
        context: e.context,
      })),
    };
    const e = new ErrorValidation(message, data);
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
class ErrorParse extends AbstractError<void> {
  static description: string = 'Failed to parse data into valid format';
  exitCode = sysexits.DATAERR;
  public keyPath: Array<string>;
  public value: any;
  public context: object;
}

export { ErrorValidation, ErrorParse };
