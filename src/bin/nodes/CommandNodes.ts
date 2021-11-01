import CommandAdd from './CommandAdd';
import CommandClaim from './CommandClaim';
import CommandFind from './CommandFind';
import CommandPing from './CommandPing';
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
  }
}

export default CommandNodes;
