import { createCommand } from '../utils';

import commandStartAgent from './commandStartAgent';
import commandStatusAgent from './commandStatusAgent';
import commandStopAgent from './commandStopAgent';

const commandAgent = createCommand('agent');
commandAgent.description('manipulate agent');
commandAgent.addCommand(commandStartAgent);
commandAgent.addCommand(commandStatusAgent);
commandAgent.addCommand(commandStopAgent);

export default commandAgent;
