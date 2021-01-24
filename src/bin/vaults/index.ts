import commander from 'commander';
import * as agentPB from '../../proto/js/Agent_pb';
import {
  actionRunner,
  getPKLogger,
  PKMessageType,
  resolveKeynodeStatePath,
  getAgentClient,
  promisifyGrpc,
} from '../utils';

const commandListVaults = new commander.Command('list');
commandListVaults.description('list all available vaults');
commandListVaults.alias('ls');
commandListVaults.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandListVaults.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandListVaults.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);
    const res = (await promisifyGrpc(client.listVaults.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.StringListMessage;
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

const commandScanVaults = new commander.Command('scan');
commandScanVaults.description('scan a known peer for accessible vaults');
commandScanVaults.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandScanVaults.option('-v, --verbose', 'increase verbosity by one level');
commandScanVaults.requiredOption(
  '-pi, --peer-id <peerId>',
  '(required) id string of the peer to be scanned',
);
commandScanVaults.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.StringMessage();
    request.setS(options.peerId);
    const res = (await promisifyGrpc(client.scanVaultNames.bind(client))(
      request,
    )) as agentPB.StringListMessage;
    const vaultNames = res.getSList();

    if (!vaultNames || vaultNames.length == 0) {
      pkLogger.logV1('no vault names were found', PKMessageType.INFO);
    }

    pkLogger.logV2(
      `Vault names from peer - ${options.peerId}`,
      PKMessageType.INFO,
    );
    for (const vaultName of vaultNames) {
      pkLogger.logV1(vaultName, PKMessageType.SUCCESS);
    }
  }),
);

const commandNewVault = new commander.Command('new');
commandNewVault.description('create a new vault');
commandNewVault.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandNewVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) unique name of the new vault',
);
commandNewVault.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);
    const request = new agentPB.StringMessage();
    request.setS(options.vaultName);
    await promisifyGrpc(client.newVault.bind(client))(request);
    pkLogger.logV2(
      `vault created at '${nodePath}/${options.vaultName}'`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandRenameVault = new commander.Command('rename');
commandRenameVault.description('rename an existing vault');
commandRenameVault.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandRenameVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) name of existing vault to be renamed',
);
commandRenameVault.requiredOption(
  '-nn, --new-name <newName>',
  '(required) new name for vault',
);
commandRenameVault.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.StringMessage();
    request.setS(options.vaultName);
    await promisifyGrpc(client.renameVault.bind(client))(request);
    pkLogger.logV2(
      `vault successfully renamed to '${nodePath}/${options.vaultName}'`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandVaultStats = new commander.Command('stats');
commandVaultStats.description('get the stats for a vault');
commandVaultStats.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandVaultStats.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) name of vault',
);
commandVaultStats.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.StringMessage();
    request.setS(options.vaultName);
    const statsResponse = (await promisifyGrpc(
      client.getVaultStats.bind(client),
    )(request)) as agentPB.VaultStatsMessage;
    const date = new Date(statsResponse.getCreatedAt());
    const stats = { createdAt: date.toISOString() };
    pkLogger.logV1(JSON.stringify(stats), PKMessageType.SUCCESS);
  }),
);

const commandPullVault = new commander.Command('pull');
commandPullVault.description('pull a vault from a peer');
commandPullVault.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandPullVault.requiredOption(
  '-pi, --peer-id <peerId>',
  '(required) id string of the peer who has the vault',
);
commandPullVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) name of the vault to be cloned',
);
commandPullVault.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const vaultName = options.vaultName;

    const request = new agentPB.VaultPathMessage();
    request.setPublicKey(options.peerId);
    request.setVaultName(vaultName);
    await promisifyGrpc(client.pullVault.bind(client))(request);

    pkLogger.logV2(
      `vault '${vaultName}' pulled successfully`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandShareVault = new commander.Command('share');
commandShareVault.description('pull a vault from a peer');
commandShareVault.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandShareVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) name of the vault to be shared',
);
commandShareVault.requiredOption(
  '-pi, --peer-id <peerId>',
  '(required) id string of the peer which the vault is to be shared with',
);
commandShareVault.option(
  '-ce, --can-edit <canEdit>',
  'peer can edit vault (i.e. push as well as pull)',
);
commandShareVault.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const vaultName = options.vaultName;
    const peerId = options.vaultName;
    const canEdit = options.canEdit;

    const request = new agentPB.ShareVaultMessage();
    request.setVaultName(vaultName);
    request.setPeerId(peerId);
    request.setCanEdit(canEdit);
    await promisifyGrpc(client.shareVault.bind(client))(request);

    pkLogger.logV2(
      `vault '${vaultName}' successfully shared with peerId: '${peerId}'`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandUnshareVault = new commander.Command('unshare');
commandUnshareVault.description('pull a vault from a peer');
commandUnshareVault.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandUnshareVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) name of the vault to be unshared',
);
commandUnshareVault.requiredOption(
  '-pi, --peer-id <peerId>',
  '(required) id string of the peer which the vault is to be unshared with',
);
commandUnshareVault.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);
    const vaultName = options.vaultName;
    const peerId = options.vaultName;
    const request = new agentPB.VaultPathMessage();
    request.setPublicKey(peerId);
    request.setVaultName(vaultName);
    await promisifyGrpc(client.unshareVault.bind(client))(request);
    pkLogger.logV2(
      `vault '${vaultName}' successfully unshared from peerId: '${peerId}'`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandDeleteVault = new commander.Command('delete');
commandDeleteVault.alias('del');
commandDeleteVault.description('delete an existing vault');
commandDeleteVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  'name of vault',
);
commandDeleteVault.option('-v, --verbose', 'increase verbosity by one level');
commandDeleteVault.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const vaultName = options.vaultName;
    const request = new agentPB.StringMessage();
    request.setS(vaultName);
    await promisifyGrpc(client.deleteVault.bind(client))(request);

    pkLogger.logV2(
      `vault '${vaultName}' deleted successfully`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandVaults = new commander.Command('vaults');
commandVaults.description('manipulate vaults');
commandVaults.addCommand(commandListVaults);
commandVaults.addCommand(commandScanVaults);
commandVaults.addCommand(commandNewVault);
commandVaults.addCommand(commandRenameVault);
commandVaults.addCommand(commandVaultStats);
commandVaults.addCommand(commandPullVault);
commandVaults.addCommand(commandShareVault);
commandVaults.addCommand(commandUnshareVault);
commandVaults.addCommand(commandDeleteVault);

export default commandVaults;
