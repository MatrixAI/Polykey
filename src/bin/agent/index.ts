import start from './start';
import status from './status';
import stop from './stop';
import lock from './lock';
import unlock from './unlock';
import lockall from './lockall';
import * as binUtils from '../utils';

const commandAgent = binUtils.createCommand('agent');
commandAgent.description('manipulate agent');
commandAgent.addCommand(start);
commandAgent.addCommand(status);
commandAgent.addCommand(stop);
commandAgent.addCommand(lock);
commandAgent.addCommand(unlock);
commandAgent.addCommand(lockall);

export default commandAgent;
