import commander from 'commander';
import * as pb from '../../../proto/compiled/Agent_pb';
import { actionRunner, PKMessageType, determineNodePath, promisifyGrpc, getAgentClient, getPKLogger } from '../utils';

function makeClientCommand() {
  return new commander.Command('client')
    .description(
      'get oauth client details for the http api (useful for client credentials authorization flow on swagger docs)',
    )
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option(
      '-v, --verbosity, <verbosity>',
      'set the verbosity level, can choose from levels 1, 2 or 3',
      (str) => parseInt(str),
      1,
    )
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity);
        const client = await getAgentClient(nodePath, pkLogger);

        const req = new pb.StringMessage();
        req.setS(options.id);
        const res = (await promisifyGrpc(client.getOAuthClient.bind(client))(
          new pb.EmptyMessage(),
        )) as pb.OAuthClientMessage;

        pkLogger.logV2('client id:', PKMessageType.INFO);
        pkLogger.logV1(res.getId(), PKMessageType.SUCCESS);

        pkLogger.logV2('client secret:', PKMessageType.INFO);
        pkLogger.logV1(res.getSecret(), PKMessageType.SUCCESS);
      }),
    );
}

export default makeClientCommand;
