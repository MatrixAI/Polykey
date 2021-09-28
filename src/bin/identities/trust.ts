import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import { parseId } from './utils';
import * as utils from '../../utils';

const trust = createCommand('trust', {
  description: {
    description: 'Trusts a node id or identity',
    args: {
      id: 'nodeId or "providerId:identityId"',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});

trust.arguments('<id>');
trust.action(async (id, options) => {
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
  const action = 'notify';
  try {
    await client.start({});
    const grpcClient = client.grpcClient;
    const setActionMessage = new clientPB.SetActionsMessage();
    setActionMessage.setAction(action);
    if (nodeId) {
      // Setting by Node.
      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setNodeId(nodeId);
      setActionMessage.setNode(nodeMessage);
      const pCall = grpcClient.gestaltsActionsSetByNode(setActionMessage);
      const { p, resolveP } = utils.promise();
      pCall.call.on('metadata', async (meta) => {
        await clientUtils.refreshSession(meta, client.session);
        resolveP(null);
      });
      await pCall;
      await p;
    } else {
      //  Setting by Identity
      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setProviderId(providerId!);
      providerMessage.setMessage(identityId!);
      setActionMessage.setIdentity(providerMessage);
      const pCall = grpcClient.gestaltsActionsSetByIdentity(setActionMessage);
      const { p, resolveP } = utils.promise();
      pCall.call.on('metadata', async (meta) => {
        await clientUtils.refreshSession(meta, client.session);
        resolveP(null);
      });
      await pCall;
      await p;
    }

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Trusting: ${id}`],
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

export default trust;
