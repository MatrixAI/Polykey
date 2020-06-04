import chalk from 'chalk'
import commander from 'commander'
import initPolyKey from "./initPolykey"
import { actionRunner, pkLogger, PKMessageType } from './polykey'

function makeListVaultsCommand() {
  return new commander.Command('list')
  .description('list all available vaults')
  .alias('ls')
  .option('-v, --verbose', 'increase verbosity level by one')
  .action(actionRunner(async (options) => {
    const pk = await initPolyKey()
    if (options.verbose) {
      pkLogger(`vaults contained within polykey:`, PKMessageType.INFO)
    }
    const vaultList = pk.listVaults()
    if (vaultList === undefined || vaultList.length == 0) {
      pkLogger('no vaults found', PKMessageType.INFO)
    } else {
      vaultList.forEach((vaultName) => {
        pkLogger(vaultName, PKMessageType.INFO)
      })
    }
  }))
}

function makeAddVaultCommand() {
  return new commander.Command('add')
  .description('create new vault(s)')
  .arguments('vault name(s)')
  .action(actionRunner(async (options) => {
    const pk = await initPolyKey()
    const vaultNames = options.args.values()
    for (const vaultName of vaultNames) {
      await pk.createVault(vaultName)
      pkLogger(`vault created at ${pk.polykeyPath}/${vaultName}`, PKMessageType.SUCCESS)
    }
  }))
}

function makeRemoveVaultCommand() {
  return new commander.Command('remove')
  .description('destroy an existing vault')
  .option('-n, --vault-name <vaultName>', 'name of vault')
  .option('-a, --all', 'remove all vaults')
  .option('-v, --verbose', 'increase verbosity by one level')
  .action(actionRunner(async (options) => {
    const pk = await initPolyKey()
    const verbose: boolean = options.verbose ?? false
    const deleteAll: boolean = options.all ?? false
    if (deleteAll) {
      const vaultList = pk.listVaults()
      if (vaultList === undefined || vaultList.length == 0) {
        pkLogger('no vaults found', PKMessageType.INFO)
      } else {
        for (const vaultName of vaultList) {
          await pk.destroyVault(vaultName)
          if (verbose) {
            pkLogger(`destroyed ${vaultName}`, PKMessageType.SUCCESS)
          }
        }
        pkLogger('all vaults destroyed successfully', PKMessageType.SUCCESS)
      }
      return
    }
    const vaultName = options.vaultName
    if (!vaultName) {
      throw new Error(chalk.red('error: did not receive vault name'))
    }
    if (!(await pk.vaultExists(vaultName))) {
      throw new Error(`vault '${vaultName}' does not exist`)
    }

    await pk.destroyVault(vaultName)
    pkLogger(`vault '${vaultName}' destroyed ${await pk.vaultExists(vaultName) ? 'un-' : ''}successfully`, PKMessageType.SUCCESS)
  }))
}

function makeVaultsCommand() {
  return new commander.Command('vaults')
  .description('manipulate vaults')
  .addCommand(makeListVaultsCommand())
  .addCommand(makeAddVaultCommand())
  .addCommand(makeRemoveVaultCommand())
}

export default makeVaultsCommand
