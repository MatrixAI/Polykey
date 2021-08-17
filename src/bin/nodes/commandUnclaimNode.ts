import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandUnclaimNode = createCommand('claim', {
  description: {
    description: 'Unclaim a node, removes a link between to the node.',
    args: {
      node: 'Id of the node.',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandUnclaimNode.arguments('<node>');
commandUnclaimNode.action(async (node, options) => {
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

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    //Claiming the node.
    //FIXME: Placeholder, not currently supported.
    // const nodeMessage = new clientPB.NodeMessage();
    // nodeMessage.setName(node);
    // const res = await grpcClient.nodesAdd(nodeMessage);
    // console.log(JSON.stringify(res.toObject()));

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`/*TODO*/ write an output.`],
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
    throw err;
  } finally {
    await client.stop();
  }
});

export default commandUnclaimNode;
