import CommandConnections from './CommandConnections';
import CommandPolykey from '../CommandPolykey';

class CommandNetwork extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('network');
    this.description('Network Operations');
    this.addCommand(new CommandConnections(...args));
  }
}

export default CommandNetwork;
