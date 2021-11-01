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
    this.addCommand(new CommandLock(...args));
    this.addCommand(new CommandLockAll(...args));
    this.addCommand(new CommandStart(...args));
    this.addCommand(new CommandStatus(...args));
    this.addCommand(new CommandStop(...args));
    this.addCommand(new CommandUnlock(...args));
  }
}

export default CommandAgent;
