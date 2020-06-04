#!/usr/bin/env node

// this will be a CLI entrypoint to this library
// we expect that this can be used as a CLI
// application directly as js-polykey

import chalk from 'chalk'
import { program } from 'commander'
import makeConfigCommand from './config/Config'
import makeSecretsCommand from './secrets/Secrets'
import makeKeyManagerCommand from './keymanager/KeyManager'
import makeNodeCommand from './node/Node'
import makeCryptoCommand from './crypto/Crypto'
import makeVaultsCommand from './vaults/Vaults'


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
  .version(require('../package.json').version, '--version', 'output the current version')
  .addCommand(makeConfigCommand())
  .addCommand(makeKeyManagerCommand())
  .addCommand(makeNodeCommand())
  .addCommand(makeSecretsCommand())
  .addCommand(makeVaultsCommand())
  .addCommand(makeCryptoCommand())

// Check if anything needs to be prompted for polykey init
async function main() {
  polykey.parse(process.argv)
}
main()

export { actionRunner, PKMessageType, pkLogger }
