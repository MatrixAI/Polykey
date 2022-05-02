import { AbstractError } from '@matrixai/errors';
import sysexits from './utils/sysexits';

class ErrorPolykey<T> extends AbstractError<T> {
  static description: string = 'Polykey error';
  exitCode: number = sysexits.GENERAL;
}

export default ErrorPolykey;
