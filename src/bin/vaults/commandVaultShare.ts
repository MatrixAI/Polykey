import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import PolykeyClient from '../../PolykeyClient';
import { clientPB } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandVaultShare = binUtils.createCommand('share', {
  description: 'Sets the permissions of a vault for Node Ids',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandVaultShare.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) Name of the vault to set permissions from',
);
commandVaultShare.option(
  '-u --unset',
  'Removes the current permissions for the vault',
);
commandVaultShare.arguments('Nodes to set the permissions for');
commandVaultShare.action(async (options, command) => {
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

  const nodeList: string[] = Array.from<string>(command.args.values());

  const shareMessage = new clientPB.ShareMessage();
  shareMessage.setName(options.vaultName);
  shareMessage.setId(JSON.stringify(nodeList));
  shareMessage.setSet(options.unset);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    await grpcClient.vaultsShare(
      shareMessage,
      meta,
      await client.session.createJWTCallCredentials(),
    );

    const msg = options.unset ? 'Unshared' : 'Shared';

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `${msg} Vault: ${shareMessage.getName()} to: ${shareMessage.getId()}`,
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
    options.passwordFile = undefined;
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandVaultShare;
