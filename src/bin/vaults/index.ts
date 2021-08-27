import create from './create';
import deleteVault from './delete';
import list from './list';
import pull from './pull';
import clone from './clone';
import rename from './rename';
import scan from './scan';
import stat from './stat';
import share from './share';
import unshare from './unshare';
import permissions from './permissions';
import * as binUtils from '../utils';

const commandVaults = binUtils.createCommand('vaults');
commandVaults.description('manipulate vaults');
commandVaults.addCommand(create);
commandVaults.addCommand(deleteVault);
commandVaults.addCommand(list);
commandVaults.addCommand(pull);
commandVaults.addCommand(clone);
commandVaults.addCommand(rename);
commandVaults.addCommand(scan);
commandVaults.addCommand(stat);
commandVaults.addCommand(share);
commandVaults.addCommand(unshare);
commandVaults.addCommand(permissions);

export default commandVaults;
