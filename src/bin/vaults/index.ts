import process from 'process';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  createCommand,
  verboseToLogLevel,
  resolveKeynodeStatePath,
  getAgentClient,
  promisifyGrpc,
} from '../utils';

const commandListVaults = createCommand('list', { verbose: true });
commandListVaults.description('list all available vaults');
commandListVaults.alias('ls');
commandListVaults.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandListVaults.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const res = (await promisifyGrpc(client.listVaults.bind(client))(
    new agentPB.EmptyMessage(),
  )) as agentPB.StringListMessage;
  const vaultNames = res.getSList();
  if (vaultNames === undefined || vaultNames.length == 0) {
    process.stdout.write('no vaults found\n');
  } else {
    vaultNames.forEach((vaultName: string, index: number) =>
      process.stdout.write(`${index + 1}: ${vaultName}\n`),
    );
  }
});

const commandScanVaults = createCommand('scan', { verbose: true });
commandScanVaults.description('scan a known node for accessible vaults');
commandScanVaults.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandScanVaults.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) id string of the node to be scanned',
);
commandScanVaults.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.StringMessage();
  request.setS(options.nodeId);
  const res = (await promisifyGrpc(client.scanVaultNames.bind(client))(
    request,
  )) as agentPB.StringListMessage;
  const vaultNames = res.getSList();
  if (!vaultNames || vaultNames.length == 0) {
    process.stdout.write('no vault names were found\n');
  }
  process.stdout.write(`Vault names from node - ${options.nodeId}\n`);
  for (const vaultName of vaultNames) {
    process.stdout.write(vaultName + '\n');
  }
});

const commandNewVault = createCommand('new', { verbose: true });
commandNewVault.description('create a new vault');
commandNewVault.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandNewVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) unique name of the new vault',
);
commandNewVault.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.StringMessage();
  request.setS(options.vaultName);
  await promisifyGrpc(client.newVault.bind(client))(request);
  process.stdout.write(`vault created at '${nodePath}/${options.vaultName}'\n`);
});

const commandRenameVault = createCommand('rename', { verbose: true });
commandRenameVault.description('rename an existing vault');
commandRenameVault.option(
  '-np, --node-path <nodePath>',
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
commandRenameVault.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.StringMessage();
  request.setS(options.vaultName);
  await promisifyGrpc(client.renameVault.bind(client))(request);
  process.stdout.write(
    `vault successfully renamed to '${nodePath}/${options.vaultName}'\n`,
  );
});

const commandVaultStats = createCommand('stats', { verbose: true });
commandVaultStats.description('get the stats for a vault');
commandVaultStats.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandVaultStats.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) name of vault',
);
commandVaultStats.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.StringMessage();
  request.setS(options.vaultName);
  const statsResponse = (await promisifyGrpc(client.getVaultStats.bind(client))(
    request,
  )) as agentPB.VaultStatsMessage;
  const date = new Date(statsResponse.getCreatedAt());
  const stats = { createdAt: date.toISOString() };
  process.stdout.write(JSON.stringify(stats));
});

const commandPullVault = createCommand('pull', { verbose: true });
commandPullVault.description('pull a vault from a node');
commandPullVault.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandPullVault.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) id string of the node who has the vault',
);
commandPullVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) name of the vault to be cloned',
);
commandPullVault.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const vaultName = options.vaultName;
  const request = new agentPB.VaultPathMessage();
  request.setPublicKey(options.nodeId);
  request.setVaultName(vaultName);
  await promisifyGrpc(client.pullVault.bind(client))(request);
  process.stdout.write(`vault '${vaultName}' pulled successfully\n`);
});

const commandShareVault = createCommand('share', { verbose: true });
commandShareVault.description('pull a vault from a node');
commandShareVault.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandShareVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) name of the vault to be shared',
);
commandShareVault.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) id string of the node which the vault is to be shared with',
);
commandShareVault.option(
  '-ce, --can-edit <canEdit>',
  'node can edit vault (i.e. push as well as pull)',
);
commandShareVault.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const vaultName = options.vaultName;
  const nodeId = options.vaultName;
  const canEdit = options.canEdit;
  const request = new agentPB.ShareVaultMessage();
  request.setVaultName(vaultName);
  request.setNodeId(nodeId);
  request.setCanEdit(canEdit);
  await promisifyGrpc(client.shareVault.bind(client))(request);
  process.stdout.write(
    `vault '${vaultName}' successfully shared with nodeId: '${nodeId}'\n`,
  );
});

const commandUnshareVault = createCommand('unshare', { verbose: true });
commandUnshareVault.description('pull a vault from a node');
commandUnshareVault.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandUnshareVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) name of the vault to be unshared',
);
commandUnshareVault.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) id string of the node which the vault is to be unshared with',
);
commandUnshareVault.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const vaultName = options.vaultName;
  const nodeId = options.vaultName;
  const request = new agentPB.VaultPathMessage();
  request.setPublicKey(nodeId);
  request.setVaultName(vaultName);
  await promisifyGrpc(client.unshareVault.bind(client))(request);
  process.stdout.write(
    `vault '${vaultName}' successfully unshared from nodeId: '${nodeId}'\n`,
  );
});

const commandDeleteVault = createCommand('delete', { verbose: true });
commandDeleteVault.alias('del');
commandDeleteVault.description('delete an existing vault');
commandDeleteVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  'name of vault',
);
commandDeleteVault.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const vaultName = options.vaultName;
  const request = new agentPB.StringMessage();
  request.setS(vaultName);
  await promisifyGrpc(client.deleteVault.bind(client))(request);
  process.stdout.write(`vault '${vaultName}' deleted successfully\n`);
});

const commandVaults = createCommand('vaults');
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
