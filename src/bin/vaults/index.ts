import commandCreateVault from './commandCreateVault';
import commandDeleteVault from './commandDeleteVault';
import commandListVaults from './commandListVaults';
import commandPullVault from './commandPullVault';
import commandCloneVault from './commandCloneVault';
import commandRenameVault from './commandRenameVault';
import commandScanVault from './commandScanVault';
import commandVaultStats from './commandVaultStats';
import commandSetPermsVault from './commandSetPermsVault';
import commandUnsetPermsVault from './commandUnsetPermsVault';
import commandVaultPermissions from './commandVaultPermissions';
import * as binUtils from '../utils';

const commandVaults = binUtils.createCommand('vaults');
commandVaults.description('manipulate vaults');
commandVaults.addCommand(commandCreateVault);
commandVaults.addCommand(commandDeleteVault);
commandVaults.addCommand(commandListVaults);
commandVaults.addCommand(commandPullVault);
commandVaults.addCommand(commandCloneVault);
commandVaults.addCommand(commandRenameVault);
commandVaults.addCommand(commandScanVault);
commandVaults.addCommand(commandVaultStats);
commandVaults.addCommand(commandSetPermsVault);
commandVaults.addCommand(commandUnsetPermsVault);
commandVaults.addCommand(commandVaultPermissions);

export default commandVaults;
