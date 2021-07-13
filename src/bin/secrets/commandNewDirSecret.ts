import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandNewDirSecret = binUtils.createCommand('dir', {
  description: 'Adds a directory of secrets within a given vault',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
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
  const secretNewMessage = new clientPB.SecretNewMessage();
  const vaultMessage = new clientPB.VaultMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    vaultMessage.setName(options.vaultName);
    secretNewMessage.setVault(vaultMessage);
    secretNewMessage.setName(options.directoryPath);

    await grpcClient.vaultsNewDirSecret(
      secretNewMessage,
      meta,
      await client.session.createJWTCallCredentials(),
    );

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Secret directory added to vault: ${secretNewMessage.getName()}`,
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
    client.stop();
    options.passwordFile = undefined;
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandNewDirSecret;
