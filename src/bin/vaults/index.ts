import { createCommand } from '../utils';
import commandCreateVault from './commandCreateVault';
import commandDeleteVault from './commandDeleteVault';
import commandListVaults from './commandListVaults';
import commandPullVault from './commandPullVault';
import commandRenameVault from './commandRenameVault';
import commandScanVault from './commandScanVault';
import commandVaultStats from './commandVaultStats';

const commandVaults = createCommand('vaults');
commandVaults.description('manipulate vaults');
commandVaults.addCommand(commandCreateVault);
commandVaults.addCommand(commandDeleteVault);
commandVaults.addCommand(commandListVaults);
commandVaults.addCommand(commandPullVault);
commandVaults.addCommand(commandRenameVault);
commandVaults.addCommand(commandScanVault);
commandVaults.addCommand(commandVaultStats);

export default commandVaults;
