import fs from 'fs';
import commander from 'commander';
import { actionRunner, pkLogger, PKMessageType, determineNodePath, getAgentClient, promisifyGrpc } from '../utils';
import * as pb from '../../../proto/compiled/Agent_pb';

function makeRelayCommand() {
  return new commander.Command('relay')
    .description('request a relay connection from a public peer')
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-pk, --public-key <publicKey>', '(required) path to the file which contains the public key')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        // read in publicKey if it exists
        const publicKey = fs.readFileSync(options.publicKey).toString();

        const request = new pb.StringMessage();
        request.setS(publicKey);
        const res = (await promisifyGrpc(client.requestRelay.bind(client))(request)) as pb.BooleanMessage;
        if (res.getB()) {
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
    .option('-k, --node-path <nodePath>', 'provide the polykey path')
    .requiredOption('-pk, --public-key <publicKey>', '(required) path to the file which contains the public key')
    .option('-v, --verbose', 'increase verbosity level by one')
    .action(
      actionRunner(async (options) => {
        const nodePath = determineNodePath(options.nodePath);
        const client = await getAgentClient(nodePath);

        // read in publicKey if it exists
        const publicKey = fs.readFileSync(options.publicKey).toString();

        const request = new pb.StringMessage();
        request.setS(publicKey);
        const res = (await promisifyGrpc(client.requestHolePunch.bind(client))(request)) as pb.BooleanMessage;

        pkLogger(`peer address successfully hole punched`, PKMessageType.SUCCESS);
      }),
    );
}

export { makePunchCommand, makeRelayCommand };
