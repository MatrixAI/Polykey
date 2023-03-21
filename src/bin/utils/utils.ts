import type { POJO } from '../../types';
import process from 'process';
import { LogLevel } from '@matrixai/logger';
import { AbstractError } from '@matrixai/errors';
import * as binProcessors from './processors';
import ErrorPolykey from '../../ErrorPolykey';
import * as binErrors from '../errors';
import * as clientUtils from '../../client/utils/utils';
import * as clientErrors from '../../client/errors';
import * as grpcErrors from '../../grpc/errors';
import * as nodesUtils from '../../nodes/utils';
import * as utils from '../../utils';
import * as rpcErrors from '../../rpc/errors';

/**
 * Convert verbosity to LogLevel
 */
function verboseToLogLevel(c: number = 0): LogLevel {
  let logLevel = LogLevel.WARN;
  if (c === 1) {
    logLevel = LogLevel.INFO;
  } else if (c >= 2) {
    logLevel = LogLevel.DEBUG;
  }
  return logLevel;
}

type OutputObject =
  | {
      type: 'raw';
      data: string | Uint8Array;
    }
  | {
      type: 'list';
      data: Array<string>;
    }
  | {
      type: 'table';
      data: Array<POJO>;
    }
  | {
      type: 'dict';
      data: POJO;
    }
  | {
      type: 'json';
      data: any;
    }
  | {
      type: 'error';
      data: Error;
    };

function outputFormatter(msg: OutputObject): string | Uint8Array {
  let output = '';
  if (msg.type === 'raw') {
    return msg.data;
  } else if (msg.type === 'list') {
    for (let elem in msg.data) {
      // Empty string for null or undefined values
      if (elem == null) {
        elem = '';
      }
      output += `${msg.data[elem]}\n`;
    }
  } else if (msg.type === 'table') {
    for (const key in msg.data[0]) {
      output += `${key}\t`;
    }
    output = output.substring(0, output.length - 1) + `\n`;
    for (const row of msg.data) {
      for (const key in row) {
        let value = row[key];
        // Empty string for null or undefined values
        if (value == null) {
          value = '';
        }
        value = value.toString();
        // Remove the last line terminator if it exists
        // This may exist if the value is multi-line string
        value = value.replace(/(?:\r\n|\n)$/, '');
        output += `${value}\t`;
      }
      output = output.substring(0, output.length - 1) + `\n`;
    }
  } else if (msg.type === 'dict') {
    for (const key in msg.data) {
      let value = msg.data[key];
      // Empty string for null or undefined values
      if (value == null) {
        value = '';
      }
      value = JSON.stringify(value);
      // Remove the last line terminator if it exists
      // This may exist if the value is multi-line string
      value = value.replace(/(?:\r\n|\n)$/, '');
      // If the string has line terminators internally
      // Then we must append `\t` separator after each line terminator
      value = value.replace(/(\r\n|\n)/g, '$1\t');
      output += `${key}\t${value}\n`;
    }
  } else if (msg.type === 'json') {
    if (msg.data instanceof Error && !(msg.data instanceof AbstractError)) {
      msg.data = {
        type: msg.data.name,
        data: { message: msg.data.message, stack: msg.data.stack },
      };
    }
    output = JSON.stringify(msg.data);
    output += '\n';
  } else if (msg.type === 'error') {
    let currError = msg.data;
    let indent = '  ';
    while (currError != null) {
      if (currError instanceof grpcErrors.ErrorPolykeyRemoteOLD) {
        output += `${currError.name}: ${currError.description}`;
        if (currError.message && currError.message !== '') {
          output += ` - ${currError.message}`;
        }
        output += '\n';
        output += `${indent}command\t${currError.metadata.command}\n`;
        output += `${indent}nodeId\t${nodesUtils.encodeNodeId(
          currError.metadata.nodeId,
        )}\n`;
        output += `${indent}host\t${currError.metadata.host}\n`;
        output += `${indent}port\t${currError.metadata.port}\n`;
        output += `${indent}timestamp\t${currError.timestamp}\n`;
        output += `${indent}cause: `;
        currError = currError.cause;
      } else if (currError instanceof ErrorPolykey) {
        output += `${currError.name}: ${currError.description}`;
        if (currError.message && currError.message !== '') {
          output += ` - ${currError.message}`;
        }
        output += '\n';
        // Disabled to streamline output
        // output += `${indent}exitCode\t${currError.exitCode}\n`;
        // output += `${indent}timestamp\t${currError.timestamp}\n`;
        if (currError.data && !utils.isEmptyObject(currError.data)) {
          output += `${indent}data\t${JSON.stringify(currError.data)}\n`;
        }
        if (currError.cause) {
          output += `${indent}cause: `;
          if (currError.cause instanceof ErrorPolykey) {
            currError = currError.cause;
          } else if (currError.cause instanceof Error) {
            output += `${currError.cause.name}`;
            if (currError.cause.message && currError.cause.message !== '') {
              output += `: ${currError.cause.message}`;
            }
            output += '\n';
            break;
          } else {
            output += `${JSON.stringify(currError.cause)}\n`;
            break;
          }
        } else {
          break;
        }
      } else {
        output += `${currError.name}`;
        if (currError.message && currError.message !== '') {
          output += `: ${currError.message}`;
        }
        output += '\n';
        break;
      }
      indent = indent + '  ';
    }
  }
  return output;
}

/**
 * CLI Authentication Retry Loop
 * Retries unary calls on attended authentication errors
 * Known as "privilege elevation"
 */
async function retryAuthentication<T>(
  f: (meta: { authorization?: string }) => Promise<T>,
  meta: { authorization?: string } = {},
): Promise<T> {
  try {
    return await f(meta);
  } catch (e) {
    // If it is unattended, throw the exception.
    // Don't enter into a retry loop when unattended.
    // Unattended means that either the `PK_PASSWORD` or `PK_TOKEN` was set.
    if ('PK_PASSWORD' in process.env || 'PK_TOKEN' in process.env) {
      throw e;
    }
    // If it is exception is not missing or denied, then throw the exception
    const [cause] = remoteErrorCause(e);
    if (
      !(cause instanceof clientErrors.ErrorClientAuthMissing) &&
      !(cause instanceof clientErrors.ErrorClientAuthDenied)
    ) {
      throw e;
    }
  }
  // Now enter the retry loop
  while (true) {
    // Prompt the user for password
    const password = await binProcessors.promptPassword();
    if (password == null) {
      throw new binErrors.ErrorCLIPasswordMissing();
    }
    // Augment existing metadata
    const auth = {
      authorization: clientUtils.encodeAuthFromPassword(password),
    };
    try {
      return await f(auth);
    } catch (e) {
      const [cause] = remoteErrorCause(e);
      // The auth cannot be missing, so when it is denied do we retry
      if (!(cause instanceof clientErrors.ErrorClientAuthDenied)) {
        throw e;
      }
    }
  }
}

function remoteErrorCause(e: any): [any, number] {
  let errorCause = e;
  let depth = 0;
  while (errorCause instanceof rpcErrors.ErrorPolykeyRemote) {
    errorCause = errorCause.cause;
    depth++;
  }
  return [errorCause, depth];
}

export {
  verboseToLogLevel,
  outputFormatter,
  retryAuthentication,
  remoteErrorCause,
};

export type { OutputObject };
