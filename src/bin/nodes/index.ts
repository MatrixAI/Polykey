import { createCommand } from '../utils';
import commandAddNode from './commandAddNode';
import commandDeleteNode from './commandDeleteNode';
import commandGetNode from './commandGetNode';

const commandNodes = createCommand('node');
commandNodes.description('nodes commands');
commandNodes.addCommand(commandAddNode);
commandNodes.addCommand(commandDeleteNode);
commandNodes.addCommand(commandGetNode);

export default commandNodes;
