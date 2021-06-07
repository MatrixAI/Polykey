import commandStartAgent from './commandStartAgent';
import commandStatusAgent from './commandStatusAgent';
import commandStopAgent from './commandStopAgent';
import * as binUtils from '../utils';

const commandAgent = binUtils.createCommand('agent');
commandAgent.description('manipulate agent');
commandAgent.addCommand(commandStartAgent);
commandAgent.addCommand(commandStatusAgent);
commandAgent.addCommand(commandStopAgent);

export default commandAgent;
