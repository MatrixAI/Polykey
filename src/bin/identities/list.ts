import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import * as utils from '../../utils';

const list = createCommand('list', {
  description: {
    description: 'List all the gestalts in the gestalt graph',
    args: {},
  },
  aliases: ['ls'],
  nodePath: true,
  verbose: true,
  format: true,
});
list.action(async (options) => {
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
  const emptyMessage = new clientPB.EmptyMessage();
  let output: any;
  const gestalts: any = [];
  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const res = grpcClient.gestaltsGestaltList(emptyMessage);
    const { p, resolveP } = utils.promise();
    res.stream.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    for await (const val of res) {
      const gestalt = JSON.parse(val.getName());
      const newGestalt: any = {
        permissions: [],
        nodes: [],
        identities: [],
      };
      for (const node of Object.keys(gestalt.nodes)) {
        const nodeInfo = gestalt.nodes[node];
        newGestalt.nodes.push({ id: nodeInfo.id });
      }
      for (const identity of Object.keys(gestalt.identities)) {
        const identityInfo = gestalt.identities[identity];
        newGestalt.identities.push({
          providerId: identityInfo.providerId,
          identityId: identityInfo.identityId,
        });
      }
      //Getting the permissions for the gestalt.
      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setNodeId(newGestalt.nodes[0].id);
      const actionsMessage = await grpcClient.gestaltsActionsGetByNode(
        nodeMessage,
      );
      const actionList = actionsMessage.getActionList();
      if (actionList.length === 0) newGestalt.permissions = null;
      else newGestalt.permissions = actionList;
      gestalts.push(newGestalt);
    }

    await p;

    output = gestalts;
    if (options.format !== 'json') {
      //Convert to a human readable list.
      output = [];
      let count = 1;
      for (const gestalt of gestalts) {
        output.push(`gestalt ${count}`);
        output.push(`permissions: ${gestalt.permissions ?? 'None'}`);

        //Listing nodes
        for (const node of gestalt.nodes) {
          output.push(`${node.id}`);
        }
        //Listing identities
        for (const identity of gestalt.identities) {
          output.push(`${identity.providerId}:${identity.identityId}`);
        }
        output.push('');
        count++;
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

export default list;
