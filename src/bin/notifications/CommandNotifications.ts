import CommandClear from './CommandClear';
import CommandRead from './CommandRead';
import CommandSend from './CommandSend';
import CommandPolykey from '../CommandPolykey';

class CommandNotifications extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('notifications');
    this.description('Notifications Operations');
    this.addCommand(new CommandClear());
    this.addCommand(new CommandRead());
    this.addCommand(new CommandSend());
  }
}

export default CommandNotifications;
