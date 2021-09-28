import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import * as utils from '../../utils';
import { parseId } from './utils';

const get = createCommand('get', {
  description: {
    description:
      'Gets a gestalt with a node id or identity from the gestalt graph',
    args: {
      Id: 'NodeId or identityId to search for in gestalt graph',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
get.arguments('<id>');
get.action(async (id, options) => {
  //Parsing ID.
  const { providerId, identityId, nodeId } = parseId(id);

  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  clientConfig['nodePath'] = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();

  const client = await PolykeyClient.createPolykeyClient(clientConfig);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    let res: clientPB.GestaltGraphMessage;

    if (nodeId) {
      //Getting from node.
      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setNodeId(nodeId);
      const pCall = grpcClient.gestaltsGestaltGetByNode(nodeMessage);
      const { p, resolveP } = utils.promise();
      pCall.call.on('metadata', async (meta) => {
        await clientUtils.refreshSession(meta, client.session);
        resolveP(null);
      });
      res = await pCall;
      await p;
    } else {
      //Getting from identity.
      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setProviderId(providerId!);
      providerMessage.setMessage(identityId!);
      const pCall = grpcClient.gestaltsGestaltGetByIdentity(providerMessage);
      const { p, resolveP } = utils.promise();
      pCall.call.on('metadata', async (meta) => {
        await clientUtils.refreshSession(meta, client.session);
        resolveP(null);
      });
      res = await pCall;
      await p;
    }
    const gestalt = JSON.parse(res.getGestaltGraph());
    let output: any = gestalt;

    if (options.format !== 'json') {
      //Creating a list.
      output = [];
      //Listing nodes.
      for (const nodeKey of Object.keys(gestalt.nodes)) {
        const node = gestalt.nodes[nodeKey];
        output.push(`${node.id}`);
      }
      //Listing identities
      for (const identityKey of Object.keys(gestalt.identities)) {
        const identitiy = gestalt.identities[identityKey];
        output.push(`${identitiy.providerId}:${identitiy.identityId}`);
      }
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
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default get;
