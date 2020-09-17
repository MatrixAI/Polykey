import os from 'os';
import chalk from 'chalk';

/*******************************************/
// Error handler
function actionErrorHanlder(error: Error) {
  console.error(chalk.red(error.message));
}

function actionRunner(fn: (...args: any) => Promise<void>) {
  return (...args: any) => fn(...args).catch(actionErrorHanlder);
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

function pkLogger(message: string, type?: PKMessageType) {
  switch (type) {
    case PKMessageType.SUCCESS:
      console.log(chalk.green(message));
      break;
    case PKMessageType.INFO:
      console.log(chalk.blue(message));
      break;
    case PKMessageType.WARNING:
      console.log(chalk.yellow(message));
      break;
    default:
      console.log(message);
      break;
  }
}

function determineNodePath(nodePath: string | undefined) {
  const resolvedNodePath = nodePath ?? process.env.KEYNODE_PATH;
  if (!resolvedNodePath) {
    throw Error(
      'no keynode path given, you can set it as an environment variable with "export KEYNODE_PATH=\'<path>\'"',
    );
  }
  return resolveTilde(resolvedNodePath);
}

export { pkLogger, actionRunner, PKMessageType, determineNodePath, resolveTilde };
