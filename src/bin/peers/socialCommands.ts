import commander from 'commander';
import * as pb from '../../../proto/compiled/Agent_pb';
import { PolykeyProofType } from '../../peers/identity-provider/IdentityProvider';
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
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .requiredOption('-idp, --identity-provider, <identityProvider>', '(required) name of the identity provider')
    .requiredOption('-id, --identifier, <identifier>', '(required) name of the identity provider')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const identityProvider = options.identityProvider
        const identifier = options.identifier

        const request = new pb.GestaltIdentityMessage;
        request.setIdentityProviderName(identityProvider);
        request.setIdentifier(identifier);
        const response = (await promisifyGrpc(client.proveKeynode.bind(client))(request)) as pb.PolykeyProofMessage
        const type = response.getType()
        const instructions = response.getInstructions()
        const proof = response.getProof()

        if (type == PolykeyProofType.MANUAL) {
          if (!instructions) {
            pkLogger.logV1(instructions, PKMessageType.INFO)
          }
          pkLogger.logV1(proof, PKMessageType.SUCCESS)
        } else {
          pkLogger.logV1(`keynode successfully proved on '${identityProvider}'`, PKMessageType.SUCCESS);
        }
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
