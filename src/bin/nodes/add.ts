import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { utils as clientUtils } from '../../client';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import * as utils from '../../utils';

const add = createCommand('add', {
  description: {
    description: 'Manually add a node to the node graph',
    args: {
      node: 'Id of the node.',
      host: 'Ip Address of node',
      port: 'Port of node',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
add.arguments('<node> <host> <port>');
add.action(async (node, host, port, options) => {
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
  const nodeAddressMessage = new nodesPB.NodeAddress();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;
    nodeAddressMessage.setNodeId(node);
    nodeAddressMessage.setAddress(
      new nodesPB.Address().setHost(host).setPort(port),
    );

    const pCall = grpcClient.nodesAdd(nodeAddressMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });
    await pCall;
    await p;

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: ['Added node.'],
      }),
    );
  } catch (err) {
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.description}\n`);
    }
    if (err instanceof errors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.description}\n`);
    } else {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: ['Error:', err.description],
        }),
      );
    }
    throw err;
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default add;
