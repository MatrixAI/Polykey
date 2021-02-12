import commander from 'commander';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  actionRunner,
  getPKLogger,
  PKMessageType,
  resolveKeynodeStatePath,
  promisifyGrpc,
  getAgentClient,
} from '../utils';

const commandAuthenticateProvider = new commander.Command('authenticate');
commandAuthenticateProvider.alias('auth');
commandAuthenticateProvider.description(
  'authenticate a social identity provider e.g. github.com',
);
commandAuthenticateProvider.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandAuthenticateProvider.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandAuthenticateProvider.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandAuthenticateProvider.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.AuthenticateProviderRequest();
    request.setProviderKey(options.providerKey);
    const res = (await promisifyGrpc(client.authenticateProvider.bind(client))(
      request,
    )) as agentPB.AuthenticateProviderReply;

    pkLogger.logV1(
      `please enter user code: '${res.getUserCode()}'`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandAugmentKeynode = new commander.Command('augment');
commandAugmentKeynode.alias('aug');
commandAugmentKeynode.description(
  'augment the keynode on a given provider and identity',
);
commandAugmentKeynode.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandAugmentKeynode.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandAugmentKeynode.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandAugmentKeynode.requiredOption(
  '-ik, --identity-key, <identityKey>',
  '(required) key of the target identity',
);
commandAugmentKeynode.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const request = new agentPB.AugmentKeynodeRequest();
    request.setProviderKey(options.providerKey);
    request.setIdentityKey(options.identityKey);
    const response = (await promisifyGrpc(client.augmentKeynode.bind(client))(
      request,
    )) as agentPB.AugmentKeynodeReply;
    const url = response.getUrl();
    pkLogger.logV1(
      `keynode successfully augmented at '${url}'`,
      PKMessageType.SUCCESS,
    );
  }),
);

const commandSocial = new commander.Command('social');
commandSocial.description('social commands');
commandSocial.addCommand(commandAuthenticateProvider);
commandSocial.addCommand(commandAugmentKeynode);

export default commandSocial;
