import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import PolykeyClient from '../../PolykeyClient';
import { clientPB } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandRenameVault = binUtils.createCommand('rename', {
  description: 'Renames an existing vault',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandRenameVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) Name of the vault to be renamed',
);
commandRenameVault.requiredOption(
  '-nn, --new-name <newName>',
  '(required) New name for the vault',
);
commandRenameVault.action(async (options) => {
  const meta = new grpc.Metadata();

  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  if (options.nodePath) {
    clientConfig['nodePath'] = options.nodePath;
  }
  if (options.passwordFile) {
    meta.set('passwordFile', options.passwordFile);
  }
  clientConfig['nodePath'] = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();

  const client = new PolykeyClient(clientConfig);
  const vaultMessage = new clientPB.VaultMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    vaultMessage.setId(options.vaultName);
    vaultMessage.setName(options.newName);

    const pCall = grpcClient.vaultsRename(vaultMessage, meta);

    const responseMessage = await pCall;
    if (responseMessage.getSuccess()) {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Renamed vault: ${vaultMessage.getId()} to ${vaultMessage.getName()}`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [`Failed to rename vault: ${vaultMessage.getId()}`],
        }),
      );
    }
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
    client.stop();
    options.passwordFile = undefined;
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandRenameVault;
