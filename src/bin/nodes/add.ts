import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

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

  const client = new PolykeyClient(clientConfig);
  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const nodeAddressMessage = new clientPB.NodeAddressMessage();
    nodeAddressMessage.setId(node);
    nodeAddressMessage.setHost(host);
    nodeAddressMessage.setPort(port);

    const result = { success: false, message: '' };

    const pCall = grpcClient.nodesAdd(
      nodeAddressMessage,
      await client.session.createCallCredentials(),
    );
    pCall.call.on('metadata', (meta) => {
      clientUtils.refreshSession(meta, client.session);
    });
    await pCall;

    result.success = true;
    result.message = 'Added node.';

    let output: any = result;
    if (options.format === 'human') output = [result.message];

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: output,
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
  }
});

export default add;
