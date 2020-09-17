import fs from 'fs';
import commander from 'commander';
import { PolykeyAgent } from '../../Polykey';
import { actionRunner, pkLogger, PKMessageType, determineNodePath } from '../utils';
import { agentInterface } from '../../../proto/js/Agent';

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
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);
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

function makeScanVaultsCommand() {
  return new commander.Command('scan')
    .description('scan a known peer for accessible vaults')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-p, --public-key <publicKey>', 'name of vault')
    .option('-v, --verbose', 'increase verbosity by one level')
    .arguments('name of vault to remove')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options.nodePath);
        const verbose: boolean = options.verbose ?? false;

        const publicKey = fs.readFileSync(options.publicKey).toString();

        const vaultNames = await client.scanVaultNames(nodePath, publicKey);

        if (!vaultNames || vaultNames.length == 0) {
          pkLogger(`no vault names were provided`, PKMessageType.INFO);
        }

        for (const vaultName of vaultNames) {
          pkLogger(vaultName, PKMessageType.SUCCESS);
        }
      }),
    );
}

function makeNewVaultCommand() {
  return new commander.Command('new')
    .description('create new vault(s)')
    .option('--node-path <nodePath>', 'node path')
    .arguments('vault name(s)')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options.nodePath);
        for (const vaultName of options.args.values()) {
          await client.newVault(nodePath, vaultName);
          pkLogger(`vault created at '${nodePath}/${vaultName}'`, PKMessageType.SUCCESS);
        }
      }),
    );
}

function makePullVaultCommand() {
  return new commander.Command('pull')
    .description('pull a vault from a peer')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-pk, --public-key <publicKey>', 'public key file path of the peer who has the vault')
    .requiredOption('-vn, --vault-name <vaultName>', 'name of the vault to be cloned')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const nodePath = determineNodePath(options.nodePath);
        const vaultName = options.vaultName;

        // read in public key
        const publicKey = fs.readFileSync(options.publicKey).toString();

        const successful = await client.pullVault(nodePath, vaultName, publicKey.toString());
        pkLogger(`vault '${vaultName}' pulled ${successful ? 'un-' : ''}successfully`, PKMessageType.SUCCESS);
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
        const nodePath = determineNodePath(options.nodePath);
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
    .addCommand(makeScanVaultsCommand())
    .addCommand(makeNewVaultCommand())
    .addCommand(makePullVaultCommand())
    .addCommand(makeDeleteVaultCommand());
}

export default makeVaultsCommand;
