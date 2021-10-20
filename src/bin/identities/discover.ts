import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { utils as clientUtils } from '../../client';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
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
    if (nodeId) {
      // Discovery by Node.
      const nodeMessage = new nodesPB.Node();
      nodeMessage.setNodeId(nodeId);
      const pCall = grpcClient.gestaltsDiscoveryByNode(nodeMessage);
      const { p, resolveP } = utils.promise();
      pCall.call.on('metadata', async (meta) => {
        await clientUtils.refreshSession(meta, client.session);
        resolveP(null);
      });
      await pCall;
      await p;
    } else {
      //  Discovery by Identity
      const providerMessage = new identitiesPB.Provider();
      providerMessage.setProviderId(providerId!);
      providerMessage.setMessage(identityId!);
      const pCall = grpcClient.gestaltsDiscoveryByIdentity(providerMessage);
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
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandTrustGestalts;
