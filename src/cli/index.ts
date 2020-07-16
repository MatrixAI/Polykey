import os from 'os'
import chalk from 'chalk';
import { program } from 'commander';
import makeAgentCommand from './Agent';
import makeCryptoCommand from './Crypto';
import makeVaultsCommand from './Vaults';
import makeSecretsCommand from './Secrets';
import makeKeyManagerCommand from './KeyManager';

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
  return filePath
}

/*******************************************/
// Logger
enum PKMessageType {
  SUCCESS,
  INFO,
  WARNING,
  none
}

function pkLogger(message: string, type?: PKMessageType) {
  switch (type) {
    case PKMessageType.SUCCESS:
      console.log(chalk.green(message))
      break
    case PKMessageType.INFO:
      console.log(chalk.blue(message))
      break
    case PKMessageType.WARNING:
      console.log(chalk.yellow(message))
      break
    default:
      console.log(message)
      break
  }
}

function determineNodePath(options: any) {
  const nodePath = options.nodePath ?? process.env.KEYNODE_PATH
  if (!nodePath) {
    throw Error("no keynode path given, you can set it as an environment variable with \"export KEYNODE_PATH='<path>'\"")
  }
  return resolveTilde(nodePath)
}

/*******************************************/
const polykey = new program.Command()
polykey
  .version(require('../../package.json').version, '--version', 'output the current version')
  .addCommand(makeKeyManagerCommand())
  .addCommand(makeSecretsCommand())
  .addCommand(makeVaultsCommand())
  .addCommand(makeCryptoCommand())
  .addCommand(makeAgentCommand())


export { pkLogger, actionRunner, PKMessageType, determineNodePath, resolveTilde }

module.exports = function (argv: any[]) {
  polykey.parse(argv)
}
