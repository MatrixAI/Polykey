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
    this.addCommand(new CommandClone());
    this.addCommand(new CommandCreate());
    this.addCommand(new CommandDelete());
    this.addCommand(new CommandList());
    this.addCommand(new CommandLog());
    // This.addCommand(new CommandPermissions);
    this.addCommand(new CommandPull());
    this.addCommand(new CommandRename());
    // This.addCommand(new CommandScan);
    this.addCommand(new CommandShare());
    // This.addCommand(new CommandStat);
    this.addCommand(new CommandUnshare());
    this.addCommand(new CommandVersion());
  }
}

export default CommandVaults;
