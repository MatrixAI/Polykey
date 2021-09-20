import { createCommand } from '../utils';
import ping from './ping';
import claim from './claim';
// import commandUnclaimNode from "./commandUnclaimNode";
import add from './add';
import find from './find';

const commandNodes = createCommand('node');
commandNodes.description('nodes commands');
// commandNodes.addCommand(commandClaimNode);
// commandNodes.addCommand(commandUnclaimNode);
commandNodes.addCommand(ping);
commandNodes.addCommand(add);
commandNodes.addCommand(find);
commandNodes.addCommand(claim);

export default commandNodes;
