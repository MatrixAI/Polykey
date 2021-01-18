import commander from 'commander';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, getPKLogger, PKMessageType, determineNodePath, getAgentClient, promisifyGrpc } from '../utils';

function makeListVaultsCommand() {
  return new commander.Command('list')
    .description('list all available vaults')
    .alias('ls')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option(
      '-v, --verbosity, <verbosity>',
      'set the verbosity level, can choose from levels 1, 2 or 3',
      (str) => parseInt(str),
      1,
    )
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const res = (await promisifyGrpc(client.listVaults.bind(client))(
          new pb.EmptyMessage(),
        )) as pb.StringListMessage;
        const vaultNames = res.getSList();

        if (vaultNames === undefined || vaultNames.length == 0) {
          pkLogger.logV2('no vaults found', PKMessageType.INFO);
        } else {
          vaultNames.forEach((vaultName: string, index: number) =>
            pkLogger.logV1(`${index + 1}: ${vaultName}`, PKMessageType.SUCCESS),
          );
        }
      }),
    );
}

function makeScanVaultsCommand() {
  return new commander.Command('scan')
    .description('scan a known peer for accessible vaults')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbose', 'increase verbosity by one level')
    .requiredOption('-pi, --peer-id <peerId>', '(required) id string of the peer to be scanned')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const request = new pb.StringMessage();
        request.setS(options.peerId);
        const res = (await promisifyGrpc(client.scanVaultNames.bind(client))(request)) as pb.StringListMessage;
        const vaultNames = res.getSList();

        if (!vaultNames || vaultNames.length == 0) {
          pkLogger.logV1('no vault names were found', PKMessageType.INFO);
        }

        pkLogger.logV2(`Vault names from peer - ${options.peerId}`, PKMessageType.INFO);
        for (const vaultName of vaultNames) {
          pkLogger.logV1(vaultName, PKMessageType.SUCCESS);
        }
      }),
    );
}

function makeNewVaultCommand() {
  return new commander.Command('new')
    .description('create a new vault')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-vn, --vault-name <vaultName>', '(required) unique name of the new vault')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const request = new pb.StringMessage();
        request.setS(options.vaultName);
        await promisifyGrpc(client.newVault.bind(client))(request);
        pkLogger.logV2(`vault created at '${nodePath}/${options.vaultName}'`, PKMessageType.SUCCESS);
      }),
    );
}

function makeRenameVaultCommand() {
  return new commander.Command('rename')
    .description('rename an existing vault')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-vn, --vault-name <vaultName>', '(required) name of existing vault to be renamed')
    .requiredOption('-nn, --new-name <newName>', '(required) new name for vault')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const request = new pb.StringMessage();
        request.setS(options.vaultName);
        await promisifyGrpc(client.renameVault.bind(client))(request);
        pkLogger.logV2(`vault successfully renamed to '${nodePath}/${options.vaultName}'`, PKMessageType.SUCCESS);
      }),
    );
}

function makeVaultStatsCommand() {
  return new commander.Command('stats')
    .description('get the stats for a vault')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-vn, --vault-name <vaultName>', '(required) name of vault')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const request = new pb.StringMessage();
        request.setS(options.vaultName);
        const statsResponse = (await promisifyGrpc(client.getVaultStats.bind(client))(request)) as pb.VaultStatsMessage;
        const date = new Date(statsResponse.getCreatedAt());
        const stats = { createdAt: date.toISOString() };
        pkLogger.logV1(JSON.stringify(stats), PKMessageType.SUCCESS);
      }),
    );
}

function makePullVaultCommand() {
  return new commander.Command('pull')
    .description('pull a vault from a peer')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-pi, --peer-id <peerId>', '(required) id string of the peer who has the vault')
    .requiredOption('-vn, --vault-name <vaultName>', '(required) name of the vault to be cloned')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const vaultName = options.vaultName;

        const request = new pb.VaultPathMessage();
        request.setPublicKey(options.peerId);
        request.setVaultName(vaultName);
        await promisifyGrpc(client.pullVault.bind(client))(request);

        pkLogger.logV2(`vault '${vaultName}' pulled successfully`, PKMessageType.SUCCESS);
      }),
    );
}

function makeShareVaultCommand() {
  return new commander.Command('share')
    .description('pull a vault from a peer')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-vn, --vault-name <vaultName>', '(required) name of the vault to be shared')
    .requiredOption('-pi, --peer-id <peerId>', '(required) id string of the peer which the vault is to be shared with')
    .option('-ce, --can-edit <canEdit>', 'peer can edit vault (i.e. push as well as pull)')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const vaultName = options.vaultName;
        const peerId = options.vaultName;
        const canEdit = options.canEdit;

        const request = new pb.ShareVaultMessage();
        request.setVaultName(vaultName);
        request.setPeerId(peerId);
        request.setCanEdit(canEdit);
        await promisifyGrpc(client.shareVault.bind(client))(request);

        pkLogger.logV2(`vault '${vaultName}' successfully shared with peerId: '${peerId}'`, PKMessageType.SUCCESS);
      }),
    );
}

function makeUnshareVaultCommand() {
  return new commander.Command('unshare')
    .description('pull a vault from a peer')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-vn, --vault-name <vaultName>', '(required) name of the vault to be unshared')
    .requiredOption(
      '-pi, --peer-id <peerId>',
      '(required) id string of the peer which the vault is to be unshared with',
    )
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const vaultName = options.vaultName;
        const peerId = options.vaultName;

        const request = new pb.VaultPathMessage();
        request.setPublicKey(peerId);
        request.setVaultName(vaultName);
        await promisifyGrpc(client.unshareVault.bind(client))(request);

        pkLogger.logV2(`vault '${vaultName}' successfully unshared from peerId: '${peerId}'`, PKMessageType.SUCCESS);
      }),
    );
}

function makeDeleteVaultCommand() {
  return new commander.Command('delete')
    .alias('del')
    .description('delete an existing vault')
    .requiredOption('-vn, --vault-name <vaultName>', 'name of vault')
    .option('-v, --verbose', 'increase verbosity by one level')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const vaultName = options.vaultName;
        const request = new pb.StringMessage();
        request.setS(vaultName);
        await promisifyGrpc(client.deleteVault.bind(client))(request);

        pkLogger.logV2(`vault '${vaultName}' deleted successfully`, PKMessageType.SUCCESS);
      }),
    );
}

function makeVaultsCommand() {
  return new commander.Command('vaults')
    .description('manipulate vaults')
    .addCommand(makeListVaultsCommand())
    .addCommand(makeScanVaultsCommand())
    .addCommand(makeNewVaultCommand())
    .addCommand(makeRenameVaultCommand())
    .addCommand(makeVaultStatsCommand())
    .addCommand(makePullVaultCommand())
    .addCommand(makeShareVaultCommand())
    .addCommand(makeUnshareVaultCommand())
    .addCommand(makeDeleteVaultCommand());
}

export default makeVaultsCommand;
