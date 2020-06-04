import chalk from 'chalk'
import { program } from 'commander'
import makeConfigCommand from './Config'
import makeSecretsCommand from './Secrets'
import makeKeyManagerCommand from './KeyManager'
import makeNodeCommand from './Node'
import makeCryptoCommand from './Crypto'
import makeVaultsCommand from './Vaults'

/*******************************************/
// Error handler
function actionErrorHanlder(error: Error) {
  console.error(chalk.red(error.message));
}

function actionRunner(fn: (...args) => Promise<void>) {
  return (...args) => fn(...args).catch(actionErrorHanlder);
}

/*******************************************/
// Logger
enum PKMessageType {
  SUCCESS,
  INFO,
  WARNING
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


/*******************************************/
// Version info
const polykey = new program.Command()
polykey
  .version(require('../../package.json').version, '--version', 'output the current version')
  .addCommand(makeConfigCommand())
  .addCommand(makeKeyManagerCommand())
  .addCommand(makeNodeCommand())
  .addCommand(makeSecretsCommand())
  .addCommand(makeVaultsCommand())
  .addCommand(makeCryptoCommand())

export { actionRunner, PKMessageType, pkLogger }
module.exports = function(argv: any[]) {
  polykey.parse(argv)
}


