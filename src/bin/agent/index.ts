import commandStartAgent from './commandStartAgent';
import commandStatusAgent from './commandStatusAgent';
import commandStopAgent from './commandStopAgent';
import commandAgentLock from './commandAgentLock';
import commandAgentUnlock from './commandAgentUnlock';
import commandAgentLockAll from './commandAgentLockAll';
import * as binUtils from '../utils';

const commandAgent = binUtils.createCommand('agent');
commandAgent.description('manipulate agent');
commandAgent.addCommand(commandStartAgent);
commandAgent.addCommand(commandStatusAgent);
commandAgent.addCommand(commandStopAgent);
commandAgent.addCommand(commandAgentLock);
commandAgent.addCommand(commandAgentUnlock);
commandAgent.addCommand(commandAgentLockAll);

export default commandAgent;
