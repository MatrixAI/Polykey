import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import PolykeyClient from '../../PolykeyClient';
import { clientPB } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandVaultPermissions = binUtils.createCommand('permissions', {
  description: 'Sets the permissions of a vault for Node Ids',
  aliases: ['perms'],
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandVaultPermissions.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) Name of the vault to set permissions from',
);
commandVaultPermissions.option(
  '-ni, --node-id <nodeId>',
  'The node Id to check the permissions of',
);
commandVaultPermissions.action(async (options) => {
  const meta = new grpc.Metadata();

  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  if (options.passwordFile) {
    meta.set('passwordFile', options.passwordFile);
  }
  clientConfig['nodePath'] = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();

  const client = new PolykeyClient(clientConfig);
  const shareMessage = new clientPB.ShareMessage();
  shareMessage.setName(options.vaultName);
  shareMessage.setId(options.nodeId);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const data: Array<string> = [];
    const permListGenerator = grpcClient.vaultPermissions(shareMessage, meta);
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
      throw err;
    }
  } finally {
    await client.stop();
    options.passwordFile = undefined;
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandVaultPermissions;
