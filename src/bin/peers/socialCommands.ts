import commander from 'commander';
import { PolykeyAgent } from '../../Polykey';
import { actionRunner, pkLogger, PKMessageType, determineNodePath, promisifyGrpc, getAgentClient } from '../utils';
import { agentInterface } from '../../../proto/js/Agent';
import * as pb from '../../../proto/compiled/Agent_pb';

function makeFindSocialPeerCommand() {
  return new commander.Command('social')
    .description('find a peer based on a handle and service, e.g. john.smith and github')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-h, --handle <handle>', '(required) handle of the user on the specified service, e.g. john.smith')
    .requiredOption('-s, --service <service>', '(required) service where the handle can be found, e.g. github')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        const request = new pb.ContactPeerMessage();
        request.setPublicKeyOrHandle(`@${options.service}/${options.handle}`);
        const res = (await promisifyGrpc(client.findSocialPeer.bind(client))(request)) as pb.BooleanMessage;

        if (res.getB()) {
          pkLogger('peer successfully pinged', PKMessageType.SUCCESS);
        } else {
          pkLogger('ping timed out', PKMessageType.WARNING);
        }
      }),
    );
}

export { makeFindSocialPeerCommand };
