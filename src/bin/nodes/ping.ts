import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import { ErrorNodeGraphNodeNotFound } from '../../errors';
import { ErrorCLI } from '../errors';
import * as utils from '../../utils';

/**
 * This exists to re-contextualize any errors or results as a `ping failed` result and not an actual error with the command.
 * this also ensures that a failure to ping results in an exit code of 1.
 */
class ErrorNodePingFailed extends ErrorCLI {
  description: string = 'Node was not online or not found.';
  exitCode: number = 1;
}

const ping = createCommand('ping', {
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
ping.arguments('<node>');
ping.action(async (node, options) => {
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

    //Pinging a specific node.
    const nodeMessage = new clientPB.NodeMessage();
    nodeMessage.setNodeId(node);
    let statusMessage;
    let error;
    try {
      const pCall = grpcClient.nodesPing(nodeMessage);
      const { p, resolveP } = utils.promise();
      pCall.call.on('metadata', async (meta) => {
        await clientUtils.refreshSession(meta, client.session);
        resolveP(null);
      });
      statusMessage = await pCall;
      await p;
    } catch (err) {
      if (err instanceof ErrorNodeGraphNodeNotFound) {
        error = new ErrorNodePingFailed(
          `Failed to resolve node ID ${node} to an address.`,
        );
      } else {
        throw err;
      }
    }

    const status = { success: false, message: '' };
    status.success = statusMessage ? statusMessage.getSuccess() : false;
    if (!status.success && !error)
      error = new ErrorNodePingFailed('No response received');

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

    if (error != null) throw error;
  } catch (err) {
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    } else if (err instanceof ErrorNodePingFailed) {
      // Do nothing, It's printed above already.
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
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default ping;
