import { program } from 'commander';
import makeAgentCommand from './agent';
import makeCACommand from './ca';
import makePeersCommand from './peers';
import makeCryptoCommand from './crypto';
import makeVaultsCommand from './vaults';
import makeSecretsCommand from './secrets';
import makeKeyManagerCommand from './keys';
import makeOAuthCommand from './oauth';

/*******************************************/
const polykey = new program.Command();
polykey
  .version(require('../../package.json').version, '--version', 'output the current version')
  .addCommand(makeKeyManagerCommand())
  .addCommand(makeSecretsCommand())
  .addCommand(makeVaultsCommand())
  .addCommand(makePeersCommand())
  .addCommand(makeCryptoCommand())
  .addCommand(makeAgentCommand())
  .addCommand(makeCACommand())
  .addCommand(makeOAuthCommand());

module.exports = function (argv: any[]) {
  polykey.parse(argv);
};
