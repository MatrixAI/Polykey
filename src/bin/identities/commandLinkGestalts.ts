import { errors } from '@/grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandLinkGestalts = createCommand('link', {
  description: {
    description: 'Links a node to an identity or another node',
    args: {
      link: '(true/false) determines whether to link or unlink the nodes/identities',
      nodeId: 'Node Id to search for in gestalt graph',
      providerId: '(optional) Provider that identity is linked to',
      nodeTwo: '(optional) Node Id to link node to',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandLinkGestalts.requiredOption(
  '-l, --link',
  '(required) Link or unlink the two gestalts',
);
commandLinkGestalts.requiredOption(
  '-ni, --n-i <nodeId>',
  '(required) Id of the node that has the first gestalt',
);
commandLinkGestalts.option('-pi, --p-i <providerId>', 'Provider Id to link to');
commandLinkGestalts.requiredOption(
  '-nt, --n-t <nodeTwo>',
  'Id of the node to link to',
);
commandLinkGestalts.action(async (options) => {
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

  const client = new PolykeyClient(clientConfig);
  const gestaltTrustMessage = new clientPB.GestaltTrustMessage();
  gestaltTrustMessage.setSet(options.link);
  gestaltTrustMessage.setName(options.nodeId);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    if (options.nodeTwo) {
      gestaltTrustMessage.setProvider(options.nodeTwo);
      await grpcClient.gestaltsGetNode(gestaltTrustMessage);
    } else if (options.providerId) {
      gestaltTrustMessage.setProvider(options.providerId);
      await grpcClient.gestaltsGetIdentitiy(gestaltTrustMessage);
    } else {
      throw new Error('Insuffiient parameters supplied');
    }

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Link: ${gestaltTrustMessage.getSet()} node: ${gestaltTrustMessage.getName()} to ${gestaltTrustMessage.getProvider()}`,
        ],
      }),
    );
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
  } finally {
    client.stop();
  }
});

export default commandLinkGestalts;
