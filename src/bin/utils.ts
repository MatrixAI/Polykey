import path from 'path';
import os from 'os';
import chalk from 'chalk';
import * as grpc from '@grpc/grpc-js';
import { PolykeyAgent } from '../Polykey';
import * as pb from '../../proto/compiled/Agent_pb';
import { AgentClient } from '../../proto/compiled/Agent_grpc_pb';

/*******************************************/
function actionRunner(fn: (...args: any) => Promise<void>, processExit = true) {
  return (...args: any) =>
    fn(...args)
      .catch((error: Error) => {
        console.error(chalk.redBright(error.message));
      })
      .finally(() => {
        if (process.env.NODE_ENV !== 'test' && processExit) {
          process.exit(0);
        }
      });
}

function resolveTilde(filePath: string) {
  if (filePath[0] === '~' && (filePath[1] === '/' || filePath.length === 1)) {
    filePath = filePath.replace('~', os.homedir());
  }
  return filePath;
}

/*******************************************/
// Logger
enum PKMessageType {
  SUCCESS,
  INFO,
  WARNING,
  none,
}

type PKLogger = {
  logV1: (message: string, type?: PKMessageType) => void;
  logV2: (message: string, type?: PKMessageType) => void;
  logV3: (message: string, type?: PKMessageType) => void;
};

function getPKLogger(verbosityLevel = 1): PKLogger {
  const log = (message: string, type?: PKMessageType) => {
    switch (type) {
      case PKMessageType.SUCCESS:
        console.log(chalk.greenBright(message));
        break;
      case PKMessageType.INFO:
        console.info(chalk.blueBright(message));
        break;
      case PKMessageType.WARNING:
        console.warn(chalk.yellowBright(message));
        break;
      default:
        console.debug(message);
        break;
    }
  };
  return {
    logV1: (message: string, type?: PKMessageType) => log(message, type),
    logV2: (message: string, type?: PKMessageType) => (verbosityLevel >= 2 ? log(message, type) : undefined),
    logV3: (message: string, type?: PKMessageType) => (verbosityLevel >= 3 ? log(message, type) : undefined),
  };
}

function determineNodePath(nodePath?: string) {
  let defaultPath = '/';
  if (os.platform() === 'win32') {
    defaultPath = process.env.APPDATA ?? os.homedir();
  } else if (os.homedir()) {
    defaultPath = os.homedir();
  }

  const resolvedNodePath = nodePath ?? process.env.PK_PATH ?? path.join(defaultPath, '.polykey');
  if (!resolvedNodePath) {
    throw Error(
      'no keynode path, set as an environment variable "export PK_PATH=\'<path>\'", or as a argument "--node-path \'<path>\'"',
    );
  }
  return resolveTilde(resolvedNodePath);
}

function promisifyGrpc<t1, t2>(
  fn: (request: t1, callback: (error: grpc.ServiceError | null, response: t2) => void) => any,
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
  pkLogger: PKLogger,
  daemon = false,
  restartOnStopped = true,
  failOnNotInitialized = true,
) {
  if (restartOnStopped) {
    // make sure agent is running
    const pid = await PolykeyAgent.startAgent(polykeyPath, daemon, failOnNotInitialized);
    if (typeof pid == 'number') {
      pkLogger.logV2(`agent has started with a pid of ${pid}`, PKMessageType.SUCCESS);
    }
  }

  const client: AgentClient = PolykeyAgent.connectToAgent(polykeyPath);
  const res = (await promisifyGrpc(client.getStatus.bind(client))(new pb.EmptyMessage())) as pb.AgentStatusMessage;
  if (res.getStatus() != pb.AgentStatusType.ONLINE) {
    throw Error('agent is not running and could not be restarted');
  } else {
    return client;
  }
}

export { getPKLogger, actionRunner, PKMessageType, determineNodePath, resolveTilde, promisifyGrpc, getAgentClient };
