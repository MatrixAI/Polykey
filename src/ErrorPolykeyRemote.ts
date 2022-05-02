import { AbstractError } from '@matrixai/errors';
import * as errors from './errors';

class ErrorPolykeyRemote<T> extends errors.ErrorPolykey<T> {
  static description = 'Remote error from RPC call';
  exitCode = errors.sysexits.UNAVAILABLE;
}

function replacer(key: string, value: any): any {
  if (value instanceof errors.ErrorPolykey) {
    // Polykey errors have an exit code, so include this
    return {
      type: value.name,
      data: {
        description: value.description,
        message: value.message,
        exitCode: value.exitCode,
        timestamp: value.timestamp,
        data: value.data,
        cause: value.cause,
        stack: value.stack,
      }
    }
  } else if (value instanceof AbstractError) {
    // Otherwise just include the standard properties from an AbstractError
    return {
      type: value.name,
      data: {
        description: value.description,
        message: value.message,
        timestamp: value.timestamp,
        data: value.data,
        cause: value.cause,
        stack: value.stack,
      }
    }
  } else if (value instanceof Error) {
    // If it's some other type of error then only serialise the message and
    // stack (and the type of the error)
    return {
      type: value.name,
      data: {
        message: value.message,
        stack: value.stack,
      }
    }
  } else {
    // If it's not an error then just encode as is
    return value;
  }
}

function sensitiveReplacer(key: string, value: any) {
  if (key === 'stack') {
    return;
  } else {
    return replacer(key, value);
  }
}

function reviver(key: string, value: any): any {
  // If the value is an error then construct it
  if (typeof value === 'object' && typeof value.type === 'string' && typeof value.data === 'object') {
    const message = value.data.message ?? '';
    if (value.type in errors) {
      const error = new errors[value.type](
        message,
        {
          timestamp: value.data.timestamp,
          data: value.data.data,
          cause: value.data.cause,
        },
      );
      error.exitCode = value.data.exitCode;
      if (value.data.stack) {
        error.stack = value.data.stack;
      }
      return error;
    } else if (value.type in otherErrors) {
      const error = new otherErrors[value.type](message);
      if (value.data.stack) {
        error.stack = value.data.stack;
      }
      return error;
    } else {
      return value;
    }
  } else if (key === 'timestamp') {
    // Encode timestamps
    const timestampParsed = Date.parse(value);
    if (!isNaN(timestampParsed)) {
      return new Date(timestampParsed);
    } else {
      return undefined;
    }
  } else {
    return value;
  }
}

const otherErrors = {
  'Error': Error,
  'EvalError': EvalError,
  'RangeError': RangeError,
  'ReferenceError': ReferenceError,
  'SyntaxError': SyntaxError,
  'TypeError': TypeError,
  'URIError': URIError
};

export default ErrorPolykeyRemote;

export { replacer, reviver, sensitiveReplacer };
