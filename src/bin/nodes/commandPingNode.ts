import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import * as ErrorsBin from '../errors';
import { ErrorNodeGraphNodeNotFound } from '../../errors';

const commandGetNode = createCommand('ping', {
  description: {
    description: "Pings a node to check if it's online",
    args: {
      node: 'Id of the node.',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandGetNode.arguments('<node>');
commandGetNode.action(async (node, options) => {
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

    //Pinging a specific node.
    const nodeMessage = new clientPB.NodeMessage();
    nodeMessage.setName(node);
    let statusMessage;
    let error;
    try {
      statusMessage = await grpcClient.nodesPing(
        nodeMessage,
        await client.session.createJWTCallCredentials(),
      );
    } catch (err) {
      if (err instanceof ErrorNodeGraphNodeNotFound) {
        error = new ErrorsBin.ErrorPingNodeFailed(
          `Failed to resolve node ID ${node} to an address.`,
        );
      } else {
        throw err;
      }
    }

    const status = { success: false, message: '' };
    status.success = statusMessage ? statusMessage.getSuccess() : false;
    if (!status.success && !error)
      error = new ErrorsBin.ErrorPingNodeFailed('No response received');

    //Constructing message.
    if (status.success) status.message = 'Node is Active.';
    else status.message = error.message;

    const output: any = options.format === 'json' ? status : [status.message];

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: output,
      }),
    );

    if (error) throw error;
  } catch (err) {
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    } else if (err instanceof ErrorsBin.ErrorPingNodeFailed) {
      // Do nothing.
    } else if (err instanceof errors.ErrorGRPCServerNotStarted) {
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
    client.stop();
  }
});

export default commandGetNode;
