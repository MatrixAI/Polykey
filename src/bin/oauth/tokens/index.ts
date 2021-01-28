import commander from 'commander';
import * as agentPB from '../../../../proto/js/Agent_pb';
import {
  actionRunner,
  getPKLogger,
  PKMessageType,
  resolveKeynodeStatePath,
  promisifyGrpc,
  getAgentClient,
} from '../../utils';

const commandNewToken = new commander.Command('new');
commandNewToken.description('create a new bearer token for the api');
commandNewToken.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandNewToken.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandNewToken.requiredOption(
  '-s, --scopes <scopes>',
  "(required) scopes for new bearer token, must be string of space-separated scopes: 'write_vault read_vault'",
);
commandNewToken.option(
  '-e, --expiry <expiry>',
  'expiry for the new token in seconds',
);
commandNewToken.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const scopes: string[] = options.scopes.split(' ');
    const req = new agentPB.NewOAuthTokenMessage();
    req.setScopesList(scopes);
    req.setExpiry(options.expiry ?? 3600);
    const res = (await promisifyGrpc(client.newOAuthToken.bind(client))(
      req,
    )) as agentPB.StringMessage;
    pkLogger.logV1(res.getS(), PKMessageType.SUCCESS);
  }),
);

const commandRevokeToken = new commander.Command('revoke');
commandRevokeToken.description('revoke an existing bearer token for the api');
commandRevokeToken.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandRevokeToken.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandRevokeToken.requiredOption(
  '-t, --token <token>',
  '(required) token to be revoked',
);
commandRevokeToken.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const req = new agentPB.StringMessage();
    req.setS(options.token);
    await promisifyGrpc(client.revokeOAuthToken.bind(client))(req);
    pkLogger.logV2(`token was successfully revoked`, PKMessageType.SUCCESS);
  }),
);

const commandListTokens = new commander.Command('list');
commandListTokens.alias('ls');
commandListTokens.description('list all bearer tokens for the api');
commandListTokens.option(
  '-k, --node-path <nodePath>',
  'provide the polykey path',
);
commandListTokens.option(
  '-v, --verbosity, <verbosity>',
  'set the verbosity level, can choose from levels 1, 2 or 3',
  (str) => parseInt(str),
  1,
);
commandListTokens.action(
  actionRunner(async (options) => {
    const nodePath = resolveKeynodeStatePath(options.nodePath);
    const pkLogger = getPKLogger(options.verbosity);
    const client = await getAgentClient(nodePath, pkLogger);

    const res = (await promisifyGrpc(client.listOAuthTokens.bind(client))(
      new agentPB.EmptyMessage(),
    )) as agentPB.StringListMessage;
    for (const s of res.getSList()) {
      pkLogger.logV1(s, PKMessageType.SUCCESS);
    }
  }),
);

const commandTokens = new commander.Command('tokens');
commandTokens.description('http api (oauth2) token operations');
commandTokens.addCommand(commandNewToken);
commandTokens.addCommand(commandRevokeToken);
commandTokens.addCommand(commandListTokens);

export default commandTokens;
