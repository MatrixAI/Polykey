import CommandCreate from './CommandCreate';
import CommandDelete from './CommandDelete';
import CommandDir from './CommandDir';
import CommandEdit from './CommandEdit';
import CommandEnv from './CommandEnv';
import CommandGet from './CommandGet';
import CommandList from './CommandList';
import CommandMkdir from './CommandMkdir';
import CommandRename from './CommandRename';
import CommandUpdate from './CommandUpdate';
import CommandPolykey from '../CommandPolykey';

class CommandSecrets extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('secrets');
    this.description('Secrets Operations');
    this.addCommand(new CommandCreate());
    this.addCommand(new CommandDelete());
    this.addCommand(new CommandDir());
    this.addCommand(new CommandEdit());
    this.addCommand(new CommandEnv());
    this.addCommand(new CommandGet());
    this.addCommand(new CommandList());
    this.addCommand(new CommandMkdir());
    this.addCommand(new CommandRename());
    this.addCommand(new CommandUpdate());
  }
}

export default CommandSecrets;
