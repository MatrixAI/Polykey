import type { Host, Port } from '../../network/types';
import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { messages, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import { ErrorNodeGraphNodeNotFound } from '../../errors';
import { ErrorCLI } from '../errors';
import { buildAddress } from '../../network/utils';
import * as utils from '../../utils';

/**
 * This exists to re-contextualize any errors or results as a `failure to find node` result and not an actual error with the command.
 * this also ensures that a failure to ping results in an exit code of 1.
 */
class ErrorNodeFindFailed extends ErrorCLI {
  description: string = 'Failed to find the node in the DHT';
  exitCode: number = 1;
}

const find = createCommand('find', {
  description: {
    description: 'Tries to find a node in the DHT',
    args: {
      node: 'Id of the node.',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
find.arguments('<node>');
find.action(async (node, options) => {
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

    const nodeMessage = new messages.nodes.Node();
    nodeMessage.setNodeId(node);

    const result = { success: false, message: '', id: '', host: '', port: 0 };
    try {
      const pCall = grpcClient.nodesFind(nodeMessage);
      const { p, resolveP } = utils.promise();
      pCall.call.on('metadata', async (meta) => {
        await clientUtils.refreshSession(meta, client.session);
        resolveP(null);
      });
      const res = await pCall;
      await p;

      result.success = true;
      result.id = res.getNodeId();
      result.host = res.getAddress()!.getHost();
      result.port = res.getAddress()!.getPort();
      result.message = `Found node at ${buildAddress(
        result.host as Host,
        result.port as Port,
      )}`;
    } catch (err) {
      if (!(err instanceof ErrorNodeGraphNodeNotFound)) throw err;
      // Else failed to find the node.
      result.success = false;
      result.id = node;
      result.host = '';
      result.port = 0;
      result.message = `Failed to find node ${result.id}`;
    }

    let output: any = result;
    if (options.format === 'human') output = [result.message];

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: output,
      }),
    );
    //Like ping it should error when failing to find node for automation reasons.
    if (!result.success) throw new ErrorNodeFindFailed(result.message);
  } catch (err) {
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    } else if (err instanceof errors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else if (err instanceof ErrorNodeFindFailed) {
      //Do nothing, error already printed in stdout.
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

export default find;
