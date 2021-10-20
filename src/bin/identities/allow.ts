import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { messages, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';
import { parseId } from './utils';
import * as utils from '../../utils';

const allow = createCommand('allow', {
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

allow.arguments('<id> <permissions>');
allow.action(async (id, permissions, options) => {
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
  const gestaltTrustMessage = new messages.gestalts.Trust();
  gestaltTrustMessage.setSet(options.trust);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;
    const setActionMessage = new messages.permissions.ActionSet();
    setActionMessage.setAction(permissions);
    let name: string;
    if (nodeId) {
      // Setting by Node.
      const nodeMessage = new messages.nodes.Node();
      nodeMessage.setNodeId(nodeId);
      setActionMessage.setNode(nodeMessage);
      name = `${nodeId}`;
      //Trusting
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
      const providerMessage = new messages.identities.Provider();
      providerMessage.setProviderId(providerId!);
      providerMessage.setMessage(identityId!);
      setActionMessage.setIdentity(providerMessage);
      name = `${id}`;
      //Trusting.
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
        data: [`Allowing: ${name} ${permissions}`],
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
          type: 'error',
          description: err.description,
          message: err.message,
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

export default allow;
