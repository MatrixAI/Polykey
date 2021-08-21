import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import { parseId } from './utils';
import * as utils from '../../utils';

const commandTrustGestalts = createCommand('discover', {
  description: {
    description:
      'Starts discovery process using Node or Identity as a starting point.',
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
    if (nodeId) {
      // Discovery by Node.
      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setNodeId(nodeId);
      await grpcClient.gestaltsDiscoveryByNode(nodeMessage);
    } else {
      //  Discovery by Identity
      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setProviderId(providerId!);
      providerMessage.setMessage(identityId!);
      const pCall = grpcClient.gestaltsDiscoveryByIdentity(providerMessage);
      pCall.call.on('metadata', (meta) => {
        clientUtils.refreshSession(meta, client.session);
      });
      await pCall;
    }

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Starting discovery at: ${id}...`],
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

export default commandTrustGestalts;
