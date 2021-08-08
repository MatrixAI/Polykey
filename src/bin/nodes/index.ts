import { createCommand } from '../utils';
// import commandClaimNode from './commandClaimNode';
import commandGetNode from './commandGetNode';
import commandPingNode from './commandPingNode';
// import commandUnclaimNode from "./commandUnclaimNode";
import commandAddNode from './commandAddNode';
import commandFindNode from './commandFindNode';

const commandNodes = createCommand('node');
commandNodes.description('nodes commands');
// commandNodes.addCommand(commandClaimNode);
// commandNodes.addCommand(commandUnclaimNode);
commandNodes.addCommand(commandGetNode);
commandNodes.addCommand(commandPingNode);
commandNodes.addCommand(commandAddNode);
commandNodes.addCommand(commandFindNode);

export default commandNodes;
