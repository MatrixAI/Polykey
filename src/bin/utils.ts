import path from 'path';
import os from 'os';
import commander from 'commander';
import Logger, { LogLevel } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { PolykeyAgent } from '../Polykey';
import * as agentPB from '../proto/js/Agent_pb';
import { AgentClient } from '../proto/js/Agent_grpc_pb';

const logger = new Logger('polykey');

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

export {
  verboseToLogLevel,
  createCommand,
  promisifyGrpc,
  getAgentClient,
  PolykeyCommand,
};
