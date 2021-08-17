import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandNewDirSecret = binUtils.createCommand('dir', {
  description: 'Adds a directory of secrets within a given vault',
  nodePath: true,
  verbose: true,
  format: true,
});
commandNewDirSecret.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) Name of the vault to add the secrets to',
);
commandNewDirSecret.requiredOption(
  '-dp, --directory-path <directoryPath>',
  '(required) Path to the directory of secrets to add',
);
commandNewDirSecret.action(async (options) => {
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
  const secretDirectoryMessage = new clientPB.SecretDirectoryMessage();
  const vaultMessage = new clientPB.VaultMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    vaultMessage.setName(options.vaultName);
    secretDirectoryMessage.setVault(vaultMessage);
    secretDirectoryMessage.setSecretdirectory(options.directoryPath);

    const pCall = grpcClient.vaultsNewDirSecret(
      secretDirectoryMessage,
      await client.session.createCallCredentials(),
    );
    pCall.call.on('metadata', (meta) => {
      clientUtils.refreshSession(meta, client.session);
    });

    await pCall;

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Secret directory added to vault: ${secretDirectoryMessage.getSecretdirectory()}`,
        ],
      }),
    );
  } catch (err) {
    if (err instanceof grpcErrors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    }
    if (err instanceof grpcErrors.ErrorGRPCServerNotStarted) {
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

export default commandNewDirSecret;
