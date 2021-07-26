import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { clientPB, utils as clientUtils } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandVaultPermissions = binUtils.createCommand('permissions', {
  description: {
    description: 'Sets the permissions of a vault for Node Ids',
    args: {
      vaultName: 'Name or ID of the vault',
      nodeId: '(optional) nodeId to check permission on',
    },
  },
  aliases: ['perms'],
  nodePath: true,
  verbose: true,
  format: true,
});
commandVaultPermissions.arguments('<vaultName> [nodeId]');
commandVaultPermissions.action(async (vaultName, nodeId, options) => {
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

  const vaultMessage = new clientPB.VaultMessage();
  vaultMessage.setName(vaultName);

  const nodeMessage = new clientPB.VaultMessage();
  nodeMessage.setId(nodeId);

  const getVaultMessage = new clientPB.GetVaultPermMessage();
  getVaultMessage.setVault(vaultMessage);
  getVaultMessage.setNode(nodeMessage);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const data: Array<string> = [];
    const permListGenerator = grpcClient.vaultPermissions(
      getVaultMessage,
      await client.session.createCallCredentials(),
    );
    permListGenerator.stream.on('metadata', (meta) => {
      clientUtils.refreshSession(meta, client.session);
    });
    for await (const perm of permListGenerator) {
      data.push(`${perm.getId()}:\t\t${perm.getAction()}`);
    }

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: data,
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
    }
    throw err;
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandVaultPermissions;
