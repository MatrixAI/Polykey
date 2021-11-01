import CommandClear from './CommandClear';
import CommandRead from './CommandRead';
import CommandSend from './CommandSend';
import CommandPolykey from '../CommandPolykey';

class CommandNotifications extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('notifications');
    this.description('Notifications Operations');
    this.addCommand(new CommandClear(...args));
    this.addCommand(new CommandRead(...args));
    this.addCommand(new CommandSend(...args));
  }
}

export default CommandNotifications;
