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
import commandTokens from './tokens';

const commandClient = createCommand('client', { verbose: true });
commandClient.description(
  'get oauth client details for the http api (useful for client credentials authorization flow on swagger docs)',
);
commandClient.option('-np, --node-path <nodePath>', 'provide the polykey path');
commandClient.action(async (options, command) => {
  const logLevel = verboseToLogLevel(options.verbose);
  const logger = command.logger;
  logger.setLevel(logLevel);
  const nodePath = getNodePath(options.nodePath);
  const client = await getAgentClient(nodePath, logger);
  const req = new agentPB.StringMessage();
  req.setS(options.id);
  const res = (await promisifyGrpc(client.getOAuthClient.bind(client))(
    new agentPB.EmptyMessage(),
  )) as agentPB.OAuthClientMessage;
  process.stdout.write(
    outputFormatter({
      type: options.format === 'json' ? 'json' : 'list',
      data: [`Client ID: ${res.getId()}`, `Client Secret: ${res.getSecret()}`],
    }),
  );
});

const commandOAuth = createCommand('oauth');
commandOAuth.description('http oauth2 operations');
commandOAuth.addCommand(commandClient);
commandOAuth.addCommand(commandTokens);

export default commandOAuth;
