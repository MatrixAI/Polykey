import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandGetNode = createCommand('get', {
  description: {
    description: 'Gets the information of a node from the node graph',
    args: {
      nodeId: 'Id of the node to remove',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandGetNode.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) Id of the node to be removed',
);
commandGetNode.action(async (options) => {
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
  const providerMessage = new clientPB.ProviderMessage();
  const tokenMessage = new clientPB.TokenSpecificMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    providerMessage.setId(options.providerId);
    providerMessage.setMessage(options.identity);
    tokenMessage.setProvider(providerMessage);
    tokenMessage.setToken(options.tokenData);

    await grpcClient.identitiesPutToken(tokenMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Successsfully put token: ${tokenMessage.getToken()} into identity: ${providerMessage.getId()}:${providerMessage.getMessage()}`,
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

export default commandGetNode;
