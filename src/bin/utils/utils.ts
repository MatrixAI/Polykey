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
      output += `${key}:\t${msg.data[key]}\n`;
    }
  } else if (msg.type === 'json') {
    output = JSON.stringify(msg.data);
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
    // If it is any exception other than ErrorClientAuthMissing, throw the exception
    // If it is ErrorClientAuthMissing and unattended, throw the exception
    // Unattended means that either the `PK_PASSWORD` or `PK_TOKEN` was set
    if (
      !(e instanceof clientErrors.ErrorClientAuthMissing) ||
      'PK_PASSWORD' in process.env ||
      'PK_TOKEN' in process.env
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
      if (!(e instanceof clientErrors.ErrorClientAuthDenied)) {
        throw e;
      }
    }
  }
}

export { verboseToLogLevel, outputFormatter, retryAuthentication };

export type { OutputObject };
