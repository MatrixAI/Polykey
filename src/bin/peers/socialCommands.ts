import commander from 'commander';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, getPKLogger, PKMessageType, determineNodePath, promisifyGrpc, getAgentClient } from '../utils';

function makeFindSocialPeerCommand() {
  return new commander.Command('find')
    .description('find a peer based on a handle and service, e.g. john.smith and github')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option(
      '-v, --verbosity, <verbosity>',
      'set the verbosity level, can choose from levels 1, 2 or 3',
      (str) => parseInt(str),
      1,
    )
    .requiredOption('-ha, --handle <handle>', '(required) handle of the user on the specified service, e.g. john.smith')
    .requiredOption('-s, --service <service>', '(required) service where the handle can be found, e.g. github')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const request = new pb.ContactPeerMessage();
        request.setPublicKeyOrHandle(`@${options.service}/${options.handle}`);
        await promisifyGrpc(client.findSocialPeer.bind(client))(request);

        pkLogger.logV1('peer successfully pinged', PKMessageType.SUCCESS);
      }),
    );
}

function makeProveSocialPeerCommand() {
  return new commander.Command('prove')
    .description('generate a document to be signed and advertised by a digital identity (e.g. keybase public folder)')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option(
      '-v, --verbosity, <verbosity>',
      'set the verbosity level, can choose from levels 1, 2 or 3',
      (str) => parseInt(str),
      1,
    )
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const proofMessage = (await promisifyGrpc(client.socialProof.bind(client))(
          new pb.EmptyMessage(),
        )) as pb.StringMessage;
        const proof = proofMessage.getS();

        pkLogger.logV2('post this on your keybase account under /pub/polykey.proof:', PKMessageType.INFO);
        pkLogger.logV1(proof, PKMessageType.SUCCESS);
      }),
    );
}

function makeSocialCommand() {
  return new commander.Command('social')
    .description('social proof operations')
    .addCommand(makeFindSocialPeerCommand())
    .addCommand(makeProveSocialPeerCommand());
}

export { makeSocialCommand };
