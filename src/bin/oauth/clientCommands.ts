import commander from 'commander';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, pkLogger, PKMessageType, determineNodePath, promisifyGrpc, getAgentClient } from '../utils';

function makeClientCommand() {
  return new commander.Command('client')
    .description('get oauth client details for the http api (useful for client credentials authorization flow on swagger docs)')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);

        const client = await getAgentClient(nodePath);
        const req = new pb.StringMessage
        req.setS(options.id)
        const res = (await promisifyGrpc(client.getOAuthClient.bind(client))(
          new pb.EmptyMessage,
        )) as pb.OAuthClientMessage;

        pkLogger('client id:', PKMessageType.INFO);
        pkLogger(res.getId(), PKMessageType.SUCCESS);

        pkLogger('client secret:', PKMessageType.INFO);
        pkLogger(res.getSecret(), PKMessageType.SUCCESS);
      }),
    );
}

export default makeClientCommand;
