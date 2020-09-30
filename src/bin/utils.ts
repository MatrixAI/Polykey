import os from 'os';
import chalk from 'chalk';
import * as grpc from '@grpc/grpc-js';
import { PolykeyAgent } from '../Polykey';
import * as pb from '../../proto/compiled/Agent_pb';
import { AgentClient } from '../../proto/compiled/Agent_grpc_pb';

/*******************************************/
function actionRunner(fn: (...args: any) => Promise<void>) {
  return (...args: any) =>
    fn(...args)
      .catch((error: Error) => {
        pkLogger(error.message, PKMessageType.ERROR);
      })
      .finally(() => {
        if (process.env.NODE_ENV !== 'test') {
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
  ERROR,
  none,
}

function pkLogger(message: string, type?: PKMessageType) {
  switch (type) {
    case PKMessageType.SUCCESS:
      console.log(chalk.greenBright(message));
      break;
    case PKMessageType.INFO:
      console.log(chalk.blueBright(message));
      break;
    case PKMessageType.WARNING:
      console.log(chalk.yellowBright(message));
      break;
    case PKMessageType.ERROR:
      console.error(chalk.redBright(message));
      break;
    default:
      console.log(message);
      break;
  }
}

function determineNodePath(nodePath: string | undefined) {
  const resolvedNodePath = nodePath ?? process.env.PK_PATH;
  if (!resolvedNodePath) {
    throw Error('no keynode path given, you can set it as an environment variable with "export PK_PATH=\'<path>\'"');
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
  daemon: boolean = false,
  restartOnStopped: boolean = true,
  failOnNotInitialized: boolean = true,
) {
  if (restartOnStopped) {
    // make sure agent is running
    const pid = await PolykeyAgent.startAgent(polykeyPath, daemon, failOnNotInitialized);
    if (typeof pid == 'number') {
      pkLogger(`agent has started with a pid of ${pid}`, PKMessageType.SUCCESS);
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

export { pkLogger, actionRunner, PKMessageType, determineNodePath, resolveTilde, promisifyGrpc, getAgentClient };
