import commandDeleteSecret from './commandDeleteSecret';
import commandEditSecret from './commandEditSecret';
import commandGetSecret from './commandGetSecret';
import commandListSecrets from './commandListSecrets';
import commandNewDir from './commandNewDir';
import commandNewDirSecret from './commandNewDirSecret';
import commandCreateSecret from './commandCreateSecret';
import commandRenameSecret from './commandRenameSecret';
import commandSecretEnv from './commandSecretEnv';
import commandUpdateSecret from './commandUpdateSecret';
import * as binUtils from '../utils';

const commandSecrets = binUtils.createCommand('secrets');
commandSecrets.description('manipulate secrets for a given vault');
commandSecrets.addCommand(commandDeleteSecret);
commandSecrets.addCommand(commandEditSecret);
commandSecrets.addCommand(commandGetSecret);
commandSecrets.addCommand(commandListSecrets);
commandSecrets.addCommand(commandNewDir);
commandSecrets.addCommand(commandNewDirSecret);
commandSecrets.addCommand(commandCreateSecret);
commandSecrets.addCommand(commandRenameSecret);
commandSecrets.addCommand(commandSecretEnv);
commandSecrets.addCommand(commandUpdateSecret);

export default commandSecrets;
