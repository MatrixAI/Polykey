import commander from 'commander';
import makeClientCommand from './clientCommands'
import makeTokenCommand from './tokenCommands'

function makeOAuthCommand() {
  return new commander.Command('oauth')
    .description('http oauth2 operations')
    .addCommand(makeClientCommand())
    .addCommand(makeTokenCommand());
}

export default makeOAuthCommand;
