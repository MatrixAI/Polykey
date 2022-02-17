import type { POJO } from '../../types';

import process from 'process';
import { LogLevel } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import * as binProcessors from './processors';
import * as binErrors from '../errors';
import * as clientUtils from '../../client/utils';
import * as clientErrors from '../../client/errors';

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
      name: string;
      description: string;
      message?: string;
    };

function outputFormatter(msg: OutputObject): string {
  let output = '';
  if (msg.type === 'list') {
    for (const elem in msg.data) {
      output += `${msg.data[elem]}\n`;
    }
  } else if (msg.type === 'table') {
    for (const key in msg.data[0]) {
      output += `${key}\t`;
    }
    output = output.substring(0, output.length - 1) + `\n`;
    for (const elem in msg.data) {
      for (const key in msg.data[elem]) {
        output += `${msg.data[elem][key]}\t`;
      }
      output = output.substring(0, output.length - 1) + `\n`;
    }
  } else if (msg.type === 'dict') {
    for (const key in msg.data) {
      let value = msg.data[key].toString();
      // Remove the last line terminator if it exists
      // This may exist if the value is multi-line string
      value = value.replace(/(?:\r\n|\n)$/, '');
      // If the string has line terminators internally
      // Then we must append `\t` separator after each line terminator
      value = value.replace(/(\r\n|\n)/g, '$1\t');
      output += `${key}\t${value}\n`;
    }
  } else if (msg.type === 'json') {
    output = JSON.stringify(msg.data);
    output += '\n';
  } else if (msg.type === 'error') {
    output += `${msg.name}: ${msg.description}`;
    if (msg.message) {
      output += ` - ${msg.message}`;
    }
    output += '\n';
  }
  return output;
}

/**
 * CLI Authentication Retry Loop
 * Retries unary calls on attended authentication errors
 * Known as "privilege elevation"
 */
async function retryAuthentication<T>(
  f: (meta: grpc.Metadata) => Promise<T>,
  meta: grpc.Metadata = new grpc.Metadata(),
): Promise<T> {
  try {
    return await f(meta);
  } catch (e) {
    // If it is unattended, throw the exception
    // Don't enter into a retry loop when unattended
    // Unattended means that either the `PK_PASSWORD` or `PK_TOKEN` was set
    if ('PK_PASSWORD' in process.env || 'PK_TOKEN' in process.env) {
      throw e;
    }
    // If it is exception is not missing or denied, then throw the exception
    if (
      !(e instanceof clientErrors.ErrorClientAuthMissing) &&
      !(e instanceof clientErrors.ErrorClientAuthDenied)
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
    clientUtils.encodeAuthFromPassword(password, meta);
    try {
      return await f(meta);
    } catch (e) {
      // The auth cannot be missing, so when it is denied do we retry
      if (!(e instanceof clientErrors.ErrorClientAuthDenied)) {
        throw e;
      }
    }
  }
}

export { verboseToLogLevel, outputFormatter, retryAuthentication };

export type { OutputObject };
