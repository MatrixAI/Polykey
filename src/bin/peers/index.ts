import commander from 'commander';
import {
  makeAddAliasCommand,
  makeAddPeerCommand,
  makeFindPeerCommand,
  makeGetPeerInfoCommand,
  makeListPeersCommand,
  makePingPeerCommand,
  makeStealthCommand,
  makeUpdatePeerInfoCommand,
} from './peerCommands';
import { makeSocialCommand } from './socialCommands';

function makePeersCommand() {
  return new commander.Command('peers')
    .description('peer operations')
    .addCommand(makeAddPeerCommand())
    .addCommand(makeAddAliasCommand())
    .addCommand(makeUpdatePeerInfoCommand())
    .addCommand(makeGetPeerInfoCommand())
    .addCommand(makeListPeersCommand())
    .addCommand(makePingPeerCommand())
    .addCommand(makeFindPeerCommand())
    .addCommand(makeSocialCommand())
    .addCommand(makeStealthCommand());
}

export default makePeersCommand;
