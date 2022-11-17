import CommandAllow from './CommandAllow';
import CommandAuthenticate from './CommandAuthenticate';
import CommandAuthenticated from './CommandAuthenticated';
import CommandClaim from './CommandClaim';
import CommandDisallow from './CommandDisallow';
import CommandDiscover from './CommandDiscover';
import CommandGet from './CommandGet';
import CommandList from './CommandList';
import CommandPermissions from './CommandPermissions';
import CommandSearch from './CommandSearch';
import CommandTrust from './CommandTrust';
import CommandUntrust from './CommandUntrust';
import CommandInvite from './CommandInvite';
import CommandPolykey from '../CommandPolykey';

class CommandIdentities extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('identities');
    this.description('Identities Operations');
    this.addCommand(new CommandAllow(...args));
    this.addCommand(new CommandAuthenticate(...args));
    this.addCommand(new CommandAuthenticated(...args));
    this.addCommand(new CommandClaim(...args));
    this.addCommand(new CommandDisallow(...args));
    this.addCommand(new CommandDiscover(...args));
    this.addCommand(new CommandGet(...args));
    this.addCommand(new CommandList(...args));
    this.addCommand(new CommandPermissions(...args));
    this.addCommand(new CommandSearch(...args));
    this.addCommand(new CommandTrust(...args));
    this.addCommand(new CommandUntrust(...args));
    this.addCommand(new CommandInvite(...args));
  }
}

export default CommandIdentities;
