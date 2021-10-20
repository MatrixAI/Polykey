import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { messages, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import * as utils from '../../utils';

const claim = createCommand('claim', {
  description: {
    description:
      'Send a notification to another Keynode to invite it to join your Gestalt. \
                  If an invitation from the Keynode to you already exists, this command will \
                  trigger the claming process.',
    args: {
      nodeId: 'Id of the Keynode to claim.',
      forceInvite:
        'Force a Gestalt Invite notification to be sent rather than a node claim',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
claim.arguments('<nodeId>');
claim.option(
  '-f, --force-invite',
  '(optional) Flag to force a Gestalt Invitation to be sent rather than a node claim.',
);
claim.action(async (nodeId, options) => {
  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  if (options.nodePath) {
    clientConfig['nodePath'] = options.nodePath;
  }

  const client = await PolykeyClient.createPolykeyClient(clientConfig);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    //Claiming the node.
    const nodeClaimMessage = new messages.nodes.Claim();
    nodeClaimMessage.setNodeId(nodeId);
    if (options.forceInvite) {
      nodeClaimMessage.setForceInvite(true);
    } else {
      nodeClaimMessage.setForceInvite(false);
    }

    const pCall = grpcClient.nodesClaim(nodeClaimMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });
    const response = await pCall;
    await p;

    const claimed = response.getSuccess();

    if (claimed) {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Successfully generated a cryptolink claim on Keynode with ID ${nodeId}`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Successfully sent Gestalt Invite notification to Keynode with ID ${nodeId}`,
          ],
        }),
      );
    }
  } catch (err) {
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    }
    if (err instanceof errors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: ['Error:', err.message],
        }),
      );
    }
    throw err;
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
    options.forceInvite = undefined;
  }
});

export default claim;
