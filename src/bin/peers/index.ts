import commander from 'commander';
import {
  makeAddPeerCommand,
  makeFindPeerCommand,
  makeGetPeerInfoCommand,
  makeListPeersCommand,
  makePingPeerCommand,
  makeStealthCommand,
  makeUpdatePeerInfoCommand,
} from './peerCommands';
import { makeFindSocialPeerCommand } from './socialCommands';

function makePeersCommand() {
  return new commander.Command('peers')
    .description('peer operations')
    .addCommand(makeAddPeerCommand())
    .addCommand(makeUpdatePeerInfoCommand())
    .addCommand(makeGetPeerInfoCommand())
    .addCommand(makeListPeersCommand())
    .addCommand(makePingPeerCommand())
    .addCommand(makeFindPeerCommand())
    .addCommand(makeFindSocialPeerCommand())
    .addCommand(makeStealthCommand());
}

export default makePeersCommand;
