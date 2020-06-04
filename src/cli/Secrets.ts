import fs from 'fs'
import commander from 'commander'
import initPolyKey from "./initPolykey"
import { actionRunner, pkLogger, PKMessageType } from './polykey'

function makeListSecretsCommand() {
  return new commander.Command('list')
  .description('list all available secrets for a given vault')
  .alias('ls')
  .requiredOption('-n, --vault-name <vaultName>', 'the vault name')
  .option('--verbose', 'increase verbosity level by one')
  .action(actionRunner(async (options) => {
    const pk = await initPolyKey()
    const isVerbose: boolean = options.verbose ?? false
    const vaultName: string = options.vaultName
    try {
      // Check if vault exists
      if (!(await pk.vaultExists(vaultName))) {
        throw new Error(`vault '${vaultName}' does not exist!`)
      }
      // Get list of secrets from pk
      const vault = await pk.getVault(vaultName)
      const secretsList = vault.listSecrets()

      // List secrets
      if (isVerbose) {
        pkLogger(`secrets contained within the ${vaultName} vault:`, PKMessageType.INFO)
      }
      if (secretsList.length == 0) {
        pkLogger(`no secrets found for vault '${vaultName}'`, PKMessageType.INFO)
      } else {
        secretsList.forEach((secretName) => {
          pkLogger(secretName, PKMessageType.INFO)
        })
      }
    } catch (err) {
      throw new Error(`Error when listing secrets: ${err.message}`)
    }
  }))
}

function makeAddSecretCommand() {
  return new commander.Command('add')
    .description('add a secret to a given vault')
    .requiredOption('-n, --vault-name <vaultName>', 'the vault name')
    .requiredOption('-s, --secret-name <secretName>', 'the new secret name')
    .requiredOption('-p, --secret-path <secretPath>', 'path to the secret to be removed')
    .option('--verbose', 'increase verbosity level by one')
    .action(actionRunner(async (options) => {
      const pk = await initPolyKey()
      const isVerbose: boolean = options.verbose ?? false
      const vaultName: string = options.vaultName
      const secretName: string = options.secretName
      const secretPath: string = options.secretPath
      try {
        // Check if vault exists
        if (!(await pk.vaultExists(vaultName))) {
          throw new Error(`vault '${vaultName}' does not exist!`)
        }
        const vault = await pk.getVault(secretName)
        // Check if secret exists
        if (await vault.secretExists(secretName)) {
          throw new Error(`secret '${secretName}' already exists in vault ${vaultName}!`)
        }
        // Load up secret
        const secretBuffer = fs.readFileSync(secretPath)
        // Add the secret
        await vault.addSecret(secretName, secretBuffer)
        if (await vault.secretExists(secretName)) {
          pkLogger(`secret '${secretName}' was sucessfully added to vault '${vaultName}'`, PKMessageType.SUCCESS)
        } else {
          throw new Error(`something went wrong, secret '${secretName}' was not added to vault '${vaultName}'`)
        }
      } catch (err) {
        throw new Error(`Error when adding secret: ${err.message}`)
      }
    }))
}

function makeRemoveSecretCommand() {
  return new commander.Command('remove')
    .description('remove a secret from a given vault')
    .requiredOption('-n, --vault-name <vaultName>', 'the vault name')
    .requiredOption('-s, --secret-name <secretName>', 'the new secret name')
    .option('--verbose', 'increase verbosity level by one')
    .action(actionRunner(async (options) => {
      const pk = await initPolyKey()
      const isVerbose: boolean = options.verbose ?? false
      const vaultName: string = options.vaultName
      const secretName: string = options.secretName
      try {
        // Check if vault exists
        if (!(await pk.vaultExists(vaultName))) {
          throw new Error(`vault '${vaultName}' does not exist!`)
        }
        const vault = await pk.getVault(secretName)
        // Remove secret
        await vault.removeSecret(secretName)
        if (!(await vault.secretExists(secretName))) {
          pkLogger(`secret '${secretName}' was sucessfully removed from vault '${vaultName}'`,  PKMessageType.SUCCESS)
        } else {
          throw new Error(`something went wrong, secret '${secretName}' was not removed from vault '${vaultName}'`)
        }
      } catch (err) {
        throw new Error(`Error when removing secret: ${err.message}`)
      }
    }))
}

function makeSecretsCommand() {
  return new commander.Command('secrets')
  .description('manipulate secrets for a given vault')
  .addCommand(makeListSecretsCommand())
  .addCommand(makeAddSecretCommand())
  .addCommand(makeRemoveSecretCommand())
}

export default makeSecretsCommand
