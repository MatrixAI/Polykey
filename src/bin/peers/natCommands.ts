import fs from 'fs';
import commander from 'commander';
import { PolykeyAgent } from '../../Polykey';
import { actionRunner, pkLogger, PKMessageType, determineNodePath } from '../utils';
import { agentInterface } from '../../../proto/js/Agent';

function makeRelayCommand() {
  return new commander.Command('relay')
    .description('request a relay connection from a public peer')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);

        // read in publicKey if it exists
        const publicKey = fs.readFileSync(options.publicKey).toString();

        const successful = await client.requestRelay(nodePath, publicKey);

        if (successful) {
          pkLogger('peer server successfully relayed', PKMessageType.SUCCESS);
        } else {
          pkLogger('something went wrong', PKMessageType.WARNING);
        }
      }),
    );
}

function makePunchCommand() {
  return new commander.Command('punch')
    .description('request a udp hole punched address from a peer')
    .option('--node-path <nodePath>', 'node path')
    .requiredOption('-pk, --public-key <publicKey>', 'path to the file which contains the public key')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const client = PolykeyAgent.connectToAgent();
        const status = await client.getAgentStatus();
        if (status != agentInterface.AgentStatusType.ONLINE) {
          throw Error(`agent status is: '${agentInterface.AgentStatusType[status].toLowerCase()}'`);
        }

        const nodePath = determineNodePath(options.nodePath);

        // read in publicKey if it exists
        const publicKey = fs.readFileSync(options.publicKey).toString();

        const address = await client.requestPunch(nodePath, publicKey);

        pkLogger(
          `peer server successfully served at hole punched address: ${address.toString()}`,
          PKMessageType.SUCCESS,
        );
      }),
    );
}

export { makePunchCommand, makeRelayCommand };
