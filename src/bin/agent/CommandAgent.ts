import CommandLock from './CommandLock';
import CommandLockAll from './CommandLockAll';
import CommandStart from './CommandStart';
import CommandStatus from './CommandStatus';
import CommandStop from './CommandStop';
import CommandUnlock from './CommandUnlock';
import CommandPolykey from '../CommandPolykey';

class CommandAgent extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('agent');
    this.description('Agent Operations');
    this.addCommand(new CommandLock());
    this.addCommand(new CommandLockAll());
    this.addCommand(new CommandStart());
    this.addCommand(new CommandStatus());
    this.addCommand(new CommandStop());
    this.addCommand(new CommandUnlock());
  }
}

export default CommandAgent;
