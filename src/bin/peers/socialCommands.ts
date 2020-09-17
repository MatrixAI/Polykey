import commander from 'commander';
import { PolykeyAgent } from '../../Polykey';
import { actionRunner, pkLogger, PKMessageType, determineNodePath } from '../utils';
import { agentInterface } from '../../../proto/js/Agent';

function makeFindSocialPeerCommand() {
  return new commander.Command('social')
    .description('find a peer based on a handle and service, e.g. john.smith and github')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-h, --handle <handle>', 'handle of the user on the specified service, e.g. john.smith')
    .requiredOption('-s, --service <service>', 'service where the handle can be found, e.g. github')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);

        const successful = await client.findSocialPeer(nodePath, options.handle, options.service);

        if (successful) {
          pkLogger('peer successfully pinged', PKMessageType.SUCCESS);
        } else {
          pkLogger('ping timed out', PKMessageType.WARNING);
        }
      }),
    );
}

export { makeFindSocialPeerCommand };
