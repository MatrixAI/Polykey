import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandGetGestalts = createCommand('get', {
  description: {
    description:
      'Gets a gestalt with a node id or identity from the gestalt graph',
    args: {
      nodeId: 'Node Id to search for in gestalt graph',
      providerId: 'Provider Id tto search for in gestalt graph (provider:id)',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandGetGestalts.option(
  '-ni, --node-id <nodeId>',
  'Id of node to get graph from',
);
commandGetGestalts.option(
  '-pi, --provider-id <providerId>',
  'Id of the identities provider (provider:id)',
);
commandGetGestalts.action(async (options) => {
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
  const gestaltMessage = new clientPB.GestaltMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    let res: clientPB.GestaltMessage;

    if (options.nodeId) {
      gestaltMessage.setName(options.nodeId);
      res = await grpcClient.gestaltsGetNode(gestaltMessage);
    } else if (options.providerId) {
      gestaltMessage.setName(options.providerId);
      res = await grpcClient.gestaltsGetIdentitiy(gestaltMessage);
    } else {
      throw new Error('Insuffiient parameters supplied');
    }

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`${gestaltMessage.getName()}:\t\t${res.getName()}`],
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

export default commandGetGestalts;
