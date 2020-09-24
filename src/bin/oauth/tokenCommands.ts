import commander from 'commander';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, pkLogger, PKMessageType, determineNodePath, promisifyGrpc, getAgentClient } from '../utils';

function makeNewTokenCommand() {
  return new commander.Command('new')
    .description('create a new bearer token for the api')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-s, --scopes <scopes>', "(required) scopes for new bearer token, must be string of space-separated scopes: 'write_vault read_vault'")
    .option('-e, --expiry <expiry>', 'expiry for the new token in seconds')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);

        const client = await getAgentClient(nodePath);
        const scopes: string[] = options.scopes.split(' ')
        const req = new pb.NewOAuthTokenMessage
        req.setScopesList(scopes)
        req.setExpiry(options.expiry ?? 3600)
        const res = (await promisifyGrpc(client.newOAuthToken.bind(client))(
          req,
        )) as pb.StringMessage;
        pkLogger(res.getS(), PKMessageType.SUCCESS);
      }),
    );
}

function makeRevokeTokenCommand() {
  return new commander.Command('revoke')
    .description('revoke an existing bearer token for the api')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-t, --token <token>', '(required) token to be revoked')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);

        const client = await getAgentClient(nodePath);
        const req = new pb.StringMessage
        req.setS(options.token)
        const res = (await promisifyGrpc(client.revokeOAuthToken.bind(client))(
          req,
        )) as pb.BooleanMessage;
        pkLogger(`token was ${res.getB() ? '' : 'un-'}successfully revoked`, res.getB() ? PKMessageType.SUCCESS : PKMessageType.ERROR);
      }),
    );
}

function makeListTokensCommand() {
  return new commander.Command('list')
    .alias('ls')
    .description('list all bearer tokens for the api')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);

        const client = await getAgentClient(nodePath);
        const res = (await promisifyGrpc(client.listOAuthTokens.bind(client))(
          new pb.EmptyMessage(),
        )) as pb.StringListMessage;
        for (const s of res.getSList()) {
          pkLogger(s, PKMessageType.SUCCESS);
        }
      }),
    );
}

function makeTokenCommand() {
  return new commander.Command('token')
    .description('http api (oauth2) token operations')
    .addCommand(makeNewTokenCommand())
    .addCommand(makeRevokeTokenCommand())
    .addCommand(makeListTokensCommand())
}

export default makeTokenCommand;
