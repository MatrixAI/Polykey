import CommandClone from './CommandClone';
import CommandCreate from './CommandCreate';
import CommandDelete from './CommandDelete';
import CommandList from './CommandList';
import CommandLog from './CommandLog';
// Import CommandPermissions from './CommandPermissions';
import CommandPull from './CommandPull';
import CommandRename from './CommandRename';
// Import CommandScan from './CommandScan';
import CommandShare from './CommandShare';
// Import CommandStat from './CommandStat';
import CommandUnshare from './CommandUnshare';
import CommandVersion from './CommandVersion';
import CommandPolykey from '../CommandPolykey';

class CommandVaults extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('vaults');
    this.description('Vaults Operations');
    this.addCommand(new CommandClone(...args));
    this.addCommand(new CommandCreate(...args));
    this.addCommand(new CommandDelete(...args));
    this.addCommand(new CommandList(...args));
    this.addCommand(new CommandLog(...args));
    // This.addCommand(new CommandPermissions(...args));
    this.addCommand(new CommandPull(...args));
    this.addCommand(new CommandRename(...args));
    // This.addCommand(new CommandScan(...args));
    this.addCommand(new CommandShare(...args));
    // This.addCommand(new CommandStat(...args));
    this.addCommand(new CommandUnshare(...args));
    this.addCommand(new CommandVersion(...args));
  }
}

export default CommandVaults;
