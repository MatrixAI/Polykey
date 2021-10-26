import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { messages, utils as clientUtils } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandVaultShare = binUtils.createCommand('unshare', {
  description: {
    description: 'Sets the permissions of a vault for Node Ids',
    args: {
      vaultName: 'Name or ID of vault to unshare',
      node: 'Id of the node to unset permissions for',
    },
  },

  nodePath: true,
  verbose: true,
  format: true,
});

commandVaultShare.arguments('<vaultName> <nodeId>');
commandVaultShare.action(async (vaultName, nodeId, options) => {
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

  const unsetVaultPermsMessage = new messages.vaults.PermUnset();
  const vaultMessage = new messages.vaults.Vault();
  const nodeMessage = new messages.nodes.Node();
  unsetVaultPermsMessage.setVault(vaultMessage);
  unsetVaultPermsMessage.setNode(nodeMessage);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    vaultMessage.setNameOrId(vaultName);
    nodeMessage.setNodeId(nodeId);

    const pCall = grpcClient.vaultsPermissionsUnset(unsetVaultPermsMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    await pCall;
    await p;

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Unshared Vault: ${unsetVaultPermsMessage
            .getVault()
            ?.getNameOrId()} to: ${unsetVaultPermsMessage
            .getNode()
            ?.getNodeId()}`,
        ],
      }),
    );
  } catch (err) {
    if (err instanceof grpcErrors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    } else if (err instanceof grpcErrors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stderr.write(
        binUtils.outputFormatter({
          type: 'error',
          description: err.description,
          message: err.message,
        }),
      );
      throw err;
    }
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandVaultShare;
