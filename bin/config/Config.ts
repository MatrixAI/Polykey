import commander from 'commander'
import Configstore from 'configstore'
import { actionRunner, pkLogger, PKMessageType } from '../polykey'

function makeConfigClearCommand() {
  return new commander.Command('clear')
  .description('clear the polykey config store')
  .action(actionRunner(async (options) => {
    const configStore = new Configstore('PolyKeyConfig')
    configStore.clear()
  }))
}

function makeConfigListCommand() {
  return new commander.Command('list')
  .description('list current polykey config parameters')
  .alias('ls')
  .action(actionRunner(async (options) => {
    const configStore = new Configstore('PolyKeyConfig')
    pkLogger('The current config parameters are:', PKMessageType.INFO)
    pkLogger(`Polykey Path: ${configStore.get('polykeyPath')}`, PKMessageType.INFO)
    pkLogger(`Public Key Path: ${configStore.get('publicKeyPath')}`, PKMessageType.INFO)
    pkLogger(`Private Key Path: ${configStore.get('privateKeyPath')}`, PKMessageType.INFO)
    pkLogger(`Private Key Passphrase: ${configStore.get('privatePassphrase')}`, PKMessageType.INFO)
  }))
}

function makeConfigCommand() {
  return new commander.Command('config')
  .description('configure polykey')
  .option('-pub, --public-key <publicKey>', 'provide the path to an existing public key')
  .option('-priv, --private-key <privateKey>', 'provide the path to an existing private key')
  .option('-pass, --private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
  .option('-path, --polykey-path <polykeyPath>', 'provide the polykey path. defaults to ~/.polykey')
  .option('-v, --verbose', 'increase verbosity by one level')
  .action(actionRunner(async (options) => {

    const configStore = new Configstore('PolyKeyConfig')

    if (options.polykeyPath) { configStore.set('polykeyPath', options.polykeyPath) }
    if (options.publicKeyPath) { configStore.set('publicKeyPath', options.publicKeyPath) }
    if (options.privateKeyPath) { configStore.set('privateKeyPath', options.privateKeyPath) }
    if (options.privatePassphrase) { configStore.set('privatePassphrase', options.privatePassphrase) }
  }))
  .addCommand(makeConfigClearCommand())
  .addCommand(makeConfigListCommand())
}

export default makeConfigCommand
