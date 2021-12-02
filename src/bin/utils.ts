import type { POJO } from '../types';

import os from 'os';
import process from 'process';
import prompts from 'prompts';
import { spawn } from 'cross-spawn';
import commander from 'commander';
import Logger, { LogLevel } from '@matrixai/logger';

import * as grpc from '@grpc/grpc-js';
import * as clientUtils from '../client/utils';
import * as clientErrors from '../client/errors';

function getDefaultNodePath(): string | undefined {
  const prefix = 'polykey';
  const platform = os.platform();
  let p: string;
  if (platform === 'linux') {
    const homeDir = os.homedir();
    const dataDir = process.env.XDG_DATA_HOME;
    if (dataDir != null) {
      p = `${dataDir}/${prefix}`;
    } else {
      p = `${homeDir}/.local/share/${prefix}`;
    }
  } else if (platform === 'darwin') {
    const homeDir = os.homedir();
    p = `${homeDir}/Library/Application Support/${prefix}`;
  } else if (platform === 'win32') {
    const homeDir = os.homedir();
    const appDataDir = process.env.LOCALAPPDATA;
    if (appDataDir != null) {
      p = `${appDataDir}/${prefix}`;
    } else {
      p = `${homeDir}/AppData/Local/${prefix}`;
    }
  } else {
    return;
  }
  return p;
}

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

async function requestPassword(): Promise<string> {
  const response = await prompts({
    type: 'text',
    name: 'password',
    message: 'Please enter your password',
  });
  return response.password;
}

/**
 * CLI Authentication Retry Loop
 * Retries unary calls on attended authentication errors
 * Known as "privilege elevation"
 */
async function retryAuth<T>(
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
    const password = await requestPassword();
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

function spawnShell(command: string, environmentVariables: POJO, format: string): void {
  // This code is what this function should look like after the kexec package is added
  // try {
  //   kexec(command, {
  //     stdio: 'inherit',
  //     env: environmentVariables,
  //     shell: true,
  //   });
  // } catch (err) {
  //   if (
  //     err.code !== "MODULE_NOT_FOUND" &&
  //     err.code !== "UNDECLARED_DEPENDENCY"
  //   ) {
  //     throw err;
  //   }

  //   const shell = spawn(command, {
  //     stdio: 'inherit',
  //     env: environmentVariables,
  //     shell: true,
  //   });
  //   shell.on("exit", (code: number, signal: NodeJS.Signals) => {
  //     process.on("exit", () => {
  //       if (signal) {
  //         process.kill(process.pid, signal);
  //       } else {
  //         process.exitCode = code;
  //       }
  //     });
  //   });
  //   process.on("SIGINT", () => {
  //     shell.kill("SIGINT")
  //   });
  //   shell.on('close', (code) => {
  //     if (code != 0) {
  //       process.stdout.write(
  //         outputFormatter({
  //           type: format === 'json' ? 'json' : 'list',
  //           data: [`Terminated with ${code}`],
  //         }),
  //       );
  //     }
  //   });
  // }
  const shell = spawn(command, {
    stdio: 'inherit',
    env: environmentVariables,
    shell: true,
  });

  shell.on('close', (code) => {
    if (code != 0) {
      process.stdout.write(
        outputFormatter({
          type: format === 'json' ? 'json' : 'list',
          data: [`Terminated with ${code}`],
        }),
      );
    }
  });
}

export {
  getDefaultNodePath,
  verboseToLogLevel,
  spawnShell,
  outputFormatter,
  requestPassword,
  OutputObject,
  retryAuth,
};
