import commander from 'commander';
import { actionRunner, pkLogger, PKMessageType, determineNodePath } from '.';
import { PolykeyAgent } from '../lib/Polykey';

function makeListVaultsCommand() {
  return new commander.Command('list')
    .description('list all available vaults')
    .alias('ls')
    .option('--node-path <nodePath>', 'node path')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != 'online') {
          throw Error(`agent status is: ${status}`);
        }

        const nodePath = determineNodePath(options);
        const vaultNames = await client.listVaults(nodePath);
        if (vaultNames === undefined || vaultNames.length == 0) {
          pkLogger('no vaults found', PKMessageType.INFO);
        } else {
          vaultNames.forEach((vaultName: string, index: number) => {
            pkLogger(`${index + 1}: ${vaultName}`, PKMessageType.INFO);
          });
        }
      }),
    );
}

function makeAddVaultCommand() {
  return new commander.Command('new')
    .description('create new vault(s)')
    .option('--node-path <nodePath>', 'node path')
    .arguments('vault name(s)')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options);
        const vaultNames = options.args.values();
        for (const vaultName of vaultNames) {
          await client.newVault(nodePath, vaultName);
          pkLogger(`vault created at '${nodePath}/${vaultName}'`, PKMessageType.SUCCESS);
        }
      }),
    );
}

function makeDeleteVaultCommand() {
  return new commander.Command('delete')
    .alias('del')
    .description('delete an existing vault')
    .option('-n, --vault-name <vaultName>', 'name of vault')
    .option('-v, --verbose', 'increase verbosity by one level')
    .arguments('name of vault to remove')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options);
        const verbose: boolean = options.verbose ?? false;

        const vaultNames = options.args.values();
        if (!vaultNames) {
          throw Error('error: did not receive any vault name');
        }

        for (const vaultName of vaultNames) {
          const successful = await client.destroyVault(nodePath, vaultName);
          pkLogger(`vault '${vaultName}' destroyed ${successful ? 'un-' : ''}successfully`, PKMessageType.SUCCESS);
        }

      }),
    );
}

function makeVaultsCommand() {
  return new commander.Command('vaults')
    .description('manipulate vaults')
    .addCommand(makeListVaultsCommand())
    .addCommand(makeAddVaultCommand())
    .addCommand(makeDeleteVaultCommand());
}

export default makeVaultsCommand;
