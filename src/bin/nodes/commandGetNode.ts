import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandGetNode = createCommand('get', {
  description: {
    description: 'Gets the information of a node',
    args: {
      node: '(optional) Id of the node..',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandGetNode.arguments('[node]');
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
  let res: clientPB.NodeDetailsMessage;
  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    if (node) {
      //getting specific node.
      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setName(node);
      const pCall = grpcClient.nodesGetDetails(
        nodeMessage,
        await client.session.createCallCredentials(),
      );
      pCall.call.on('metadata', (meta) => {
        clientUtils.refreshSession(meta, client.session);
      });

      res = await pCall;
    } else {
      //Getting keynode.
      const emptyMessage = new clientPB.EmptyMessage();
      const pCall = grpcClient.nodesGetLocalDetails(
        emptyMessage,
        await client.session.createCallCredentials(),
      );
      pCall.call.on('metadata', (meta) => {
        clientUtils.refreshSession(meta, client.session);
      });

      res = await pCall;
    }
    //Output here depends on the format of the response.
    let output: string[] | any = [];
    if (options.format === 'json') {
      //Json format.
      output = res.toObject();
    } else {
      // list format.
      output.push(`NodeID: ${res.getNodeId()}`);
      output.push(`Address: ${res.getNodeAddress()}`);
      output.push(`${res.getPublicKey()}`);
    }

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: output,
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

export default commandGetNode;
