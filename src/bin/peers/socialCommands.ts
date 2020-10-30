import commander from 'commander';
import { actionRunner, getPKLogger, PKMessageType, determineNodePath, promisifyGrpc, getAgentClient } from '../utils';
import * as pb from '../../../proto/compiled/Agent_pb';

function makeFindSocialPeerCommand() {
  return new commander.Command('social')
    .description('find a peer based on a handle and service, e.g. john.smith and github')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .option('-v, --verbosity, <verbosity>', 'set the verbosity level, can choose from levels 1, 2 or 3', str => parseInt(str), 1)
    .requiredOption('-h, --handle <handle>', '(required) handle of the user on the specified service, e.g. john.smith')
    .requiredOption('-s, --service <service>', '(required) service where the handle can be found, e.g. github')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const pkLogger = getPKLogger(options.verbosity)
        const client = await getAgentClient(nodePath, undefined, undefined, undefined, pkLogger);

        const request = new pb.ContactPeerMessage();
        request.setPublicKeyOrHandle(`@${options.service}/${options.handle}`);
        const res = (await promisifyGrpc(client.findSocialPeer.bind(client))(request)) as pb.BooleanMessage;

        if (res.getB()) {
          pkLogger.logV1('peer successfully pinged', PKMessageType.SUCCESS);
        } else {
          throw Error('ping timed out');
        }
      }),
    );
}

export { makeFindSocialPeerCommand };
