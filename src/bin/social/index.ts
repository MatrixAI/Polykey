import commander from 'commander';
import * as agentPB from '../../../proto/js/Agent_pb';
import { PolykeyProofType } from '../../peers/identity-provider/IdentityProvider';
import {
  actionRunner,
  getPKLogger,
  PKMessageType,
  resolveKeynodeStatePath,
  promisifyGrpc,
  getAgentClient,
} from '../utils';

const commandFindSocialPeer = new commander.Command('find');
commandFindSocialPeer.description(
  'find a peer based on a handle and service, e.g. john.smith and github',
);
commandFindSocialPeer.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandFindSocialPeer.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandFindSocialPeer.requiredOption(
  '-ha, --handle <handle>',
  '(required) handle of the user on the specified service, e.g. john.smith',
);
commandFindSocialPeer.requiredOption(
  '-s, --service <service>',
  '(required) service where the handle can be found, e.g. github',
);
commandFindSocialPeer.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.ContactPeerMessage();
    request.setPublicKeyOrHandle(`@${options.service}/${options.handle}`);
    await promisifyGrpc(client.findSocialPeer.bind(client))(request);

    pkLogger.logV1('peer successfully pinged', PKMessageType.SUCCESS);
  }),
);

const commandProveSocialPeer = new commander.Command('prove');
commandProveSocialPeer.description(
  'generate a document to be signed and advertised by a digital identity (e.g. keybase public folder)',
);
commandProveSocialPeer.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandProveSocialPeer.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandProveSocialPeer.requiredOption(
  '-idp, --identity-provider, <identityProvider>',
  '(required) name of the identity provider',
);
commandProveSocialPeer.requiredOption(
  '-id, --identifier, <identifier>',
  '(required) name of the identity provider',
);
commandProveSocialPeer.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const identityProvider = options.identityProvider;
    const identifier = options.identifier;

    const request = new agentPB.GestaltIdentityMessage();
    request.setIdentityProviderName(identityProvider);
    request.setIdentifier(identifier);
    const response = (await promisifyGrpc(client.proveKeynode.bind(client))(
      request,
    )) as agentPB.PolykeyProofMessage;
    const type = response.getType();
    const instructions = response.getInstructions();
    const proof = response.getProof();

    if (type == PolykeyProofType.MANUAL) {
      if (!instructions) {
        pkLogger.logV1(instructions, PKMessageType.INFO);
      }
      pkLogger.logV1(proof, PKMessageType.SUCCESS);
    } else {
      pkLogger.logV1(
        `keynode successfully proved on '${identityProvider}'`,
        PKMessageType.SUCCESS,
      );
    }
  }),
);

const commandSocial = new commander.Command('social');
commandSocial.description('social proof operations');
commandSocial.addCommand(commandFindSocialPeer);
commandSocial.addCommand(commandProveSocialPeer);

export default commandSocial;
