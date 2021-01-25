import commander from 'commander';
import * as agentPB from '../../../proto/js/Agent_pb';
import {
  actionRunner,
  PKMessageType,
  resolveKeynodeStatePath,
  promisifyGrpc,
  getAgentClient,
  getPKLogger,
} from '../utils';
import commandTokens from './tokens';

const commandClient = new commander.Command('client');
commandClient.description(
  'get oauth client details for the http api (useful for client credentials authorization flow on swagger docs)',
);
commandClient.option('-k, --node-path <nodePath>', 'provide the polykey path');
commandClient.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandClient.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const req = new agentPB.StringMessage();
    req.setS(options.id);
    const res = (await promisifyGrpc(client.getOAuthClient.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.OAuthClientMessage;

    pkLogger.logV2('client id:', PKMessageType.INFO);
    pkLogger.logV1(res.getId(), PKMessageType.SUCCESS);

    pkLogger.logV2('client secret:', PKMessageType.INFO);
    pkLogger.logV1(res.getSecret(), PKMessageType.SUCCESS);
  }),
);

const commandOAuth = new commander.Command('oauth');
commandOAuth.description('http oauth2 operations');
commandOAuth.addCommand(commandClient);
commandOAuth.addCommand(commandTokens);

export default commandOAuth;
