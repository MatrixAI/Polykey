import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import { parseId } from './utils';
import * as utils from '../../utils';

const commandTrustGestalts = createCommand('perms', {
  description: {
    description: 'gets the permisson for an node or identity',
    args: {
      id: 'nodeId or "providerId:identityId"',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});

commandTrustGestalts.arguments('<id>');
commandTrustGestalts.action(async (id, options) => {
  //parsing ID.
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

  const client = new PolykeyClient(clientConfig);
  try {
    await client.start({});
    const grpcClient = client.grpcClient;
    let actions;
    if (nodeId) {
      //Getting by Node.
      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setNodeId(nodeId);
      const pCall = grpcClient.gestaltsActionsGetByNode(nodeMessage);
      const { p, resolveP } = utils.promise();
      pCall.call.on('metadata', async (meta) => {
        await clientUtils.refreshSession(meta, client.session);
        resolveP(null);
      });
      const res = await pCall;
      await p;
      actions = res.getActionList();
    } else {
      //Getting by Identity
      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setProviderId(providerId!);
      providerMessage.setMessage(identityId!);
      const pCall = grpcClient.gestaltsActionsGetByIdentity(providerMessage);
      const { p, resolveP } = utils.promise();
      pCall.call.on('metadata', async (meta) => {
        await clientUtils.refreshSession(meta, client.session);
        resolveP(null);
      });
      const res = await pCall;
      await p;
      actions = res.getActionList();
    }

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Permissions: ${actions}`],
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

export default commandTrustGestalts;
