import CommandAdd from './CommandAdd';
import CommandClaim from './CommandClaim';
import CommandFind from './CommandFind';
import CommandPing from './CommandPing';
import CommandGetAll from './CommandGetAll';
import CommandConnections from './CommandConnections';
import CommandPolykey from '../CommandPolykey';

class CommandNodes extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('nodes');
    this.description('Nodes Operations');
    this.addCommand(new CommandAdd(...args));
    this.addCommand(new CommandClaim(...args));
    this.addCommand(new CommandFind(...args));
    this.addCommand(new CommandPing(...args));
    this.addCommand(new CommandGetAll(...args));
    this.addCommand(new CommandConnections(...args));
  }
}

export default CommandNodes;
