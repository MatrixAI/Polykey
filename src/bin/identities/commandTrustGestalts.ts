import { errors } from '@/grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandTrustGestalts = createCommand('trust', {
  description: {
    description:
      'Gets a gestalt with a node id or identity from the gestalt graph',
    args: {
      trust: 'Determines whether to trust or untrust the node/identity',
      nodeId: 'Node Id to search for in gestalt graph',
      providerId: 'Provider that identity is linked to',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandTrustGestalts.requiredOption(
  '-t, --trust',
  '(required) Trust or untrust the gestalt',
);
commandTrustGestalts.option(
  '-ni, --n-i <nodeId>',
  'Id of the node that to trust',
);
commandTrustGestalts.option(
  '-pi, --p-i <providerId>',
  'Provider Id to to trust',
);
commandTrustGestalts.action(async (options) => {
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
  gestaltTrustMessage.setSet(options.trust);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    if (options.nodeId) {
      gestaltTrustMessage.setName(options.nodeId);
      await grpcClient.gestaltsGetNode(gestaltTrustMessage);
    } else if (options.providerId) {
      gestaltTrustMessage.setName(options.providerId);
      await grpcClient.gestaltsGetIdentitiy(gestaltTrustMessage);
    } else {
      throw new Error('Insuffiient parameters supplied');
    }

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Trust: ${gestaltTrustMessage.getSet()} ${gestaltTrustMessage.getName()}`,
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

export default commandTrustGestalts;
