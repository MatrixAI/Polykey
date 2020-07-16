import commander from 'commander';
import { PolykeyAgent } from '../lib/Polykey';
import { actionRunner, pkLogger, PKMessageType, determineNodePath } from '.';


function makeDeriveKeyCommand() {
  return new commander.Command('derive')
    .description('manipulate the keymanager')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-n, --key-name <keyName>', 'the name of the new key')
    .requiredOption('-p, --key-passphrase <keyPassphrase>', 'the passphrase for the new key')
    .action(actionRunner(async (options) => {
      const client = PolykeyAgent.connectToAgent()
      const nodePath = determineNodePath(options)
      const keyName = options.keyName
      const keyPassphrase = options.keyPassphrase

      await client.deriveKey(nodePath, keyName, keyPassphrase)
      pkLogger(`'${keyName}' was added to the Key Manager`, PKMessageType.SUCCESS)
    }))
}

function makeKeyManagerCommand() {
  return new commander.Command('keymanager')
    .alias('km')
    .description('manipulate the keymanager')
    .addCommand(makeDeriveKeyCommand())
}

export default makeKeyManagerCommand
