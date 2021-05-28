import { createCommand } from '../utils';
import commandDeleteSecret from './commandDeleteSecret';
import commandEditSecret from './commandEditSecret';
import commandGetSecret from './commandGetSecret';
import commandListSecrets from './commandListSecrets';
import commandNewDirSecret from './commandNewDirSecret';
import commandCreateSecret from './commandCreateSecret';
import commandRenameSecret from './commandRenameSecret';
import commandSecretEnv from './commandSecretEnv';
import commandUpdateSecret from './commandUpdateSecret';

const commandSecrets = createCommand('secrets');
commandSecrets.description('manipulate secrets for a given vault');
commandSecrets.addCommand(commandDeleteSecret);
commandSecrets.addCommand(commandEditSecret);
commandSecrets.addCommand(commandGetSecret);
commandSecrets.addCommand(commandListSecrets);
commandSecrets.addCommand(commandNewDirSecret);
commandSecrets.addCommand(commandCreateSecret);
commandSecrets.addCommand(commandRenameSecret);
commandSecrets.addCommand(commandSecretEnv);
commandSecrets.addCommand(commandUpdateSecret);

export default commandSecrets;
