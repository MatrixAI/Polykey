import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import { parseId } from './utils';
import * as utils from '../../utils';

const commandAllowGestalts = createCommand('disallow', {
  description: {
    description:
      'Gets a gestalt with a node id or identity from the gestalt graph',
    args: {
      delete: 'Flag to untrust the node/identity',
      id: 'nodeId or "providerId:identityId"',
      permissions: 'Permission to set',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});

commandAllowGestalts.arguments('<id> <permissions>');
commandAllowGestalts.action(async (id, permissions, options) => {
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

  const client = new PolykeyClient(clientConfig);
  const gestaltTrustMessage = new clientPB.GestaltTrustMessage();
  gestaltTrustMessage.setSet(options.trust);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;
    const setActionMessage = new clientPB.SetActionsMessage();
    setActionMessage.setAction(permissions);
    let name: string;
    if (nodeId) {
      // Setting by Node.
      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setNodeId(nodeId);
      setActionMessage.setNode(nodeMessage);
      name = `${nodeId}`;
      //Trusting
      const pCall = grpcClient.gestaltsActionsUnsetByNode(setActionMessage);
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
      name = `${id}`;
      //Trusting.
      const pCall = grpcClient.gestaltsActionsUnsetByIdentity(setActionMessage);
      const { p, resolveP } = utils.promise();
      pCall.call.on('metadata', async (meta) => {
        await clientUtils.refreshSession(meta, client.session);
        resolveP(null);
      });
      await pCall;
      await p;
    }

    const action = options.action;
    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`Allowing: ${name} ${action}`],
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

export default commandAllowGestalts;
