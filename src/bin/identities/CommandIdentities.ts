import CommandAllow from './CommandAllow';
import CommandAuthenticate from './CommandAuthenticate';
import CommandClaim from './CommandClaim';
import CommandDisallow from './CommandDisallow';
import CommandDiscover from './CommandDiscover';
import CommandGet from './CommandGet';
import CommandList from './CommandList';
import CommandPermissions from './CommandPermissions';
import CommandSearch from './CommandSearch';
import CommandTrust from './CommandTrust';
import CommandUntrust from './CommandUntrust';
import CommandPolykey from '../CommandPolykey';

class CommandIdentities extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('identities');
    this.description('Identities Operations');
    this.addCommand(new CommandAllow());
    this.addCommand(new CommandAuthenticate());
    this.addCommand(new CommandClaim());
    this.addCommand(new CommandDisallow());
    this.addCommand(new CommandDiscover());
    this.addCommand(new CommandGet());
    this.addCommand(new CommandList());
    this.addCommand(new CommandPermissions());
    this.addCommand(new CommandSearch());
    this.addCommand(new CommandTrust());
    this.addCommand(new CommandUntrust());
  }
}

export default CommandIdentities;
