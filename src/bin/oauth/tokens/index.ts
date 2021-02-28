import process from 'process';
import * as agentPB from '../../../../proto/js/Agent_pb';
import {
  createCommand,
  verboseToLogLevel,
  resolveKeynodeStatePath,
  promisifyGrpc,
  getAgentClient,
} from '../../utils';

const commandNewToken = createCommand('new', { verbose: true });
commandNewToken.description('create a new bearer token for the api');
commandNewToken.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandNewToken.requiredOption(
  '-s, --scopes <scopes>',
  "(required) scopes for new bearer token, must be string of space-separated scopes: 'write_vault read_vault'",
);
commandNewToken.option(
  '-e, --expiry <expiry>',
  'expiry for the new token in seconds',
  (str) => parseInt(str),
);
commandNewToken.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const scopes: string[] = options.scopes.split(' ');
  const req = new agentPB.NewOAuthTokenMessage();
  req.setScopesList(scopes);
  req.setExpiry(options.expiry ?? 3600);
  const res = (await promisifyGrpc(client.newOAuthToken.bind(client))(
    req,
  )) as agentPB.StringMessage;
  process.stdout.write(res.getS() + '\n');
});

const commandRevokeToken = createCommand('revoke', { verbose: true });
commandRevokeToken.description('revoke an existing bearer token for the api');
commandRevokeToken.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandRevokeToken.requiredOption(
  '-t, --token <token>',
  '(required) token to be revoked',
);
commandRevokeToken.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const req = new agentPB.StringMessage();
  req.setS(options.token);
  await promisifyGrpc(client.revokeOAuthToken.bind(client))(req);
  process.stdout.write(`token was successfully revoked\n`);
});

const commandListTokens = createCommand('list', { verbose: true });
commandListTokens.alias('ls');
commandListTokens.description('list all bearer tokens for the api');
commandListTokens.option(
  '-np, --node-path <nodePath>',
  'provide the polykey path',
);
commandListTokens.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = resolveKeynodeStatePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const res = (await promisifyGrpc(client.listOAuthTokens.bind(client))(
    new agentPB.EmptyMessage(),
  )) as agentPB.StringListMessage;
  for (const s of res.getSList()) {
    process.stdout.write(s + '\n');
  }
});

const commandTokens = createCommand('tokens');
commandTokens.description('http api (oauth2) token operations');
commandTokens.addCommand(commandNewToken);
commandTokens.addCommand(commandRevokeToken);
commandTokens.addCommand(commandListTokens);

export default commandTokens;
