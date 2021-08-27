import deleteSecret from './delete';
import edit from './edit';
import get from './get';
import list from './list';
import mkdir from './mkdir';
import dir from './dir';
import create from './create';
import rename from './rename';
import env from './env';
import update from './update';
import * as binUtils from '../utils';

const commandSecrets = binUtils.createCommand('secrets');
commandSecrets.description('manipulate secrets for a given vault');
commandSecrets.addCommand(deleteSecret);
commandSecrets.addCommand(edit);
commandSecrets.addCommand(get);
commandSecrets.addCommand(list);
commandSecrets.addCommand(mkdir);
commandSecrets.addCommand(dir);
commandSecrets.addCommand(create);
commandSecrets.addCommand(rename);
commandSecrets.addCommand(env);
commandSecrets.addCommand(update);

export default commandSecrets;
