import type { POJO } from '../types';

import path from 'path';
import os from 'os';
import commander from 'commander';
import Logger, { LogLevel } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { PolykeyAgent } from '../Polykey';
import * as agentPB from '../proto/js/Agent_pb';
import { AgentClient } from '../proto/js/Agent_grpc_pb';

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
      data: Array<string>;
      code: number;
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
  options: { verbose?: boolean; format?: boolean } = {},
) {
  const cmd = new PolykeyCommand(name);
  if (options.verbose) {
    cmd.option(
      '-v, --verbose',
      'Log Verbose Messages',
      (_, p) => {
        return p + 1;
      },
      0,
    );
  }
  if (options.format) {
    cmd.addOption(
      new commander.Option('-f, --format <format>', 'Output Format')
        .choices(['human', 'json'])
        .default('human'),
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

async function getAgentClient(
  polykeyPath: string,
  pkLogger: Logger,
  background = false,
  restartOnStopped = true,
  failOnNotInitialized = true,
) {
  if (restartOnStopped) {
    // make sure agent is running
    const pid = await PolykeyAgent.startAgent(
      polykeyPath,
      background,
      failOnNotInitialized,
    );

    pkLogger.info(`agent has started with a pid of ${pid}`);
  }

  const client: AgentClient = PolykeyAgent.connectToAgent(polykeyPath);
  try {
    const res = (await promisifyGrpc(client.getStatus.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.AgentStatusMessage;
    if (res.getStatus() != agentPB.AgentStatusType.ONLINE) {
      throw Error('agent is offline');
    } else {
      return client;
    }
  } catch (error) {
    throw Error('agent is offline');
  }
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
  }
  return output;
}

export {
  verboseToLogLevel,
  createCommand,
  promisifyGrpc,
  getAgentClient,
  outputFormatter,
  OutputObject,
  PolykeyCommand,
};
