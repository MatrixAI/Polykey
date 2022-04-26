import { AbstractError } from '@matrixai/errors';
import sysexits from './utils/sysexits';

class ErrorPolykey<T> extends AbstractError<T> {
  static description: string = 'Polykey error';
  exitCode: number = sysexits.GENERAL;
  toJSON(): string {
    return JSON.stringify({
      name: this.name,
      description: this.description,
      message: this.message,
      exitCode: this.exitCode,
      timestamp: this.timestamp,
      data: this.data,
      cause: this.cause,
      stack: this.stack,
    });
  }
}

export default ErrorPolykey;
