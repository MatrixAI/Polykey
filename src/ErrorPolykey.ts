import type { POJO } from './types';
import { AbstractError } from '@matrixai/errors';
import sysexits from './utils/sysexits';

class ErrorPolykey<T> extends AbstractError<T> {
  static description: string = 'Polykey error';
  exitCode: number = sysexits.GENERAL;
  public toJSON(
    _key: string = '',
    options: {
      description?: boolean;
      message?: boolean;
      exitCode?: boolean;
      timestamp?: boolean;
      data?: boolean;
      cause?: boolean;
      stack?: boolean;
    } = {},
  ): {
    type: string;
    data: {
      description?: string;
      message?: string;
      exitCode?: number;
      timestamp?: Date;
      data?: POJO;
      cause?: T;
      stack?: string;
    };
  } {
    options.description ??= true;
    options.message ??= true;
    options.exitCode ??= true;
    options.timestamp ??= true;
    options.data ??= true;
    options.cause ??= true;
    options.stack ??= true;
    const data: POJO = {};
    if (options.description) data.description = this.description;
    if (options.message) data.message = this.message;
    if (options.exitCode) data.exitCode = this.exitCode;
    if (options.timestamp) data.timestamp = this.timestamp;
    if (options.data) data.data = this.data;
    if (options.cause) {
      // Propagate the options down the exception chain
      // but only if the cause is another AbstractError
      if (this.cause instanceof ErrorPolykey) {
        data.cause = this.cause.toJSON('cause', options);
      } else {
        // Use `replacer` to further encode this object
        data.cause = this.cause;
      }
    }
    if (options.stack) data.stack = this.stack;
    return {
      type: this.name,
      data,
    };
  }
}

export default ErrorPolykey;
