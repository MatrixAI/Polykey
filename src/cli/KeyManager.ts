import commander from 'commander'
import initPolyKey from './initPolykey'
import { actionRunner, pkLogger, PKMessageType } from './polykey'

function makeDeriveKeyCommand() {
  return new commander.Command('derive')
  .description('manipulate the keymanager')
  .requiredOption('-n, --key-name <keyName>', 'the name of the new key')
  .requiredOption('-p, --key-passphrase <keyPassphrase>', 'the passphrase for the new key')
  .action(actionRunner(async (options) => {
    const keyName = options.keyName
    const keyPassphrase = options.keyPassphrase
    const pk = await initPolyKey()
    pk.keyManager.generateKeySync(keyPassphrase, keyName)
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
