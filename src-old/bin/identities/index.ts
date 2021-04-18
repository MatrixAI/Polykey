import process from 'process';
import * as agentPB from '../../proto/js/Agent_pb';
import {
  createCommand,
  verboseToLogLevel,
  promisifyGrpc,
  getAgentClient,
  outputFormatter,
} from '../utils';
import { getNodePath } from '../../utils';

const commandAuthenticateProvider = createCommand('authenticate', {
  verbose: true,
  format: true,
});
commandAuthenticateProvider.alias('auth');
commandAuthenticateProvider.description(
  'authenticate a social identity provider e.g. github.com',
);
commandAuthenticateProvider.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandAuthenticateProvider.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandAuthenticateProvider.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.AuthenticateProviderRequest();
  request.setProviderKey(options.providerKey);
  const res = (await promisifyGrpc(client.authenticateProvider.bind(client))(
    request,
  )) as agentPB.AuthenticateProviderReply;
  process.stdout.write(
    outputFormatter({
      type: options.format === 'json' ? 'json' : 'list',
      data: [`User code ${res.getUserCode()}`],
    }),
  );
});

const commandAugmentKeynode = createCommand('augment', {
  verbose: true,
  format: true,
});
commandAugmentKeynode.alias('aug');
commandAugmentKeynode.description(
  'augment the keynode on a given provider and identity',
);
commandAugmentKeynode.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandAugmentKeynode.requiredOption(
  '-pk, --provider-key <providerKey>',
  '(required) key of the target provider, e.g. github.com',
);
commandAugmentKeynode.requiredOption(
  '-ik, --identity-key, <identityKey>',
  '(required) key of the target identity',
);
commandAugmentKeynode.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const request = new agentPB.AugmentKeynodeRequest();
  request.setProviderKey(options.providerKey);
  request.setIdentityKey(options.identityKey);
  const response = (await promisifyGrpc(client.augmentKeynode.bind(client))(
    request,
  )) as agentPB.AugmentKeynodeReply;
  const url = response.getUrl();
  process.stdout.write(
    outputFormatter({
      type: options.format === 'json' ? 'json' : 'list',
      data: [`Augmented at ${url}`],
    }),
  );
});

const commandSocial = createCommand('social');
commandSocial.description('social commands');
commandSocial.addCommand(commandAuthenticateProvider);
commandSocial.addCommand(commandAugmentKeynode);

export default commandSocial;
