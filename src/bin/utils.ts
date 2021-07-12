import type { POJO } from '../types';

import prompts from 'prompts';
import commander from 'commander';
import Logger, { LogLevel } from '@matrixai/logger';

import * as grpc from '@grpc/grpc-js';

const pathRegex = /^([\w-]+)(?::)([\w\-\\\/\.\$]+)(?:=)?([a-zA-Z_][\w]+)?$/;

const logger = new Logger('polykey');

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
      description: string;
      message: string;
    };

function verboseToLogLevel(c: number): LogLevel {
  let logLevel = LogLevel.WARN;
  if (c === 1) {
    logLevel = LogLevel.INFO;
  } else if (c >= 2) {
    logLevel = LogLevel.DEBUG;
  }
  return logLevel;
}

class PolykeyCommand extends commander.Command {
  logger: Logger = logger;
}

function createCommand(
  name?: string,
  {
    description,
    aliases,
    nodePath,
    verbose,
    format,
    passwordFile,
  }: {
    description?: string | { description: string; args: any };
    aliases?: Array<string>;
    nodePath?: boolean;
    verbose?: boolean;
    format?: boolean;
    passwordFile?: boolean;
  } = {},
) {
  const cmd = new PolykeyCommand(name);
  if (description) {
    if (typeof description === 'string') {
      cmd.description(description);
    } else {
      cmd.description(description.description, description.args);
    }
  }
  if (aliases) {
    cmd.aliases(aliases);
  }
  if (verbose) {
    cmd.option(
      '-v, --verbose',
      'Log Verbose Messages',
      (_, p) => {
        return p + 1;
      },
      0,
    );
  }
  if (format) {
    cmd.addOption(
      new commander.Option('-f, --format <format>', 'Output Format')
        .choices(['human', 'json'])
        .default('human'),
    );
  }
  if (nodePath) {
    cmd.option('-np, --node-path <nodePath>', 'provide the polykey path');
  }
  if (passwordFile) {
    cmd.addOption(
      new commander.Option(
        '-pf --password-file <passwordFile>',
        'Password File Path',
      ),
    );
  }
  return cmd;
}

function promisifyGrpc<t1, t2>(
  fn: (
    request: t1,
    callback: (error: grpc.ServiceError | null, response: t2) => void,
  ) => any,
): (request: t1) => Promise<t2> {
  return (request: t1): Promise<t2> => {
    return new Promise<t2>((resolve, reject) => {
      function customCallback(error: grpc.ServiceError, response: t2) {
        if (error) {
          return reject(error);
        }
        return resolve(response);
      }
      fn(request, customCallback);
      return;
    });
  };
}

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
    output += msg.description;
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

// async function requestPassword(keyManager: KeyManager, attempts: number = 3) {
//   let i = 0;
//   let correct = false;
//   while (i < attempts) {
//     const response = await prompts({
//       type: 'text',
//       name: 'password',
//       message: 'Please enter your password',
//     });
//     try {
//       clientUtils.checkPassword(response.password, keyManager);
//       correct = true;
//     } catch (err) {
//       if (err instanceof clientErrors.ErrorPassword) {
//         if (attempts == 2) {
//           throw new clientErrors.ErrorPassword();
//         }
//         i++;
//       }
//     }
//     if (correct) {
//       break;
//     }
//   }
//   return;
// }

export {
  pathRegex,
  verboseToLogLevel,
  createCommand,
  promisifyGrpc,
  outputFormatter,
  OutputObject,
  PolykeyCommand,
  requestPassword,
};
