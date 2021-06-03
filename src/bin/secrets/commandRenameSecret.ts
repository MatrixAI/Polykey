import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const commandRenameSecret = binUtils.createCommand('rename', {
  description: 'Renames a secret from a given vault',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandRenameSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to update, specified as <vaultName>:<secretPath>',
);
commandRenameSecret.requiredOption(
  '-sn, --secret-name <secretName>',
  '(required) New name for the secret',
);
commandRenameSecret.action(async (options) => {
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
  const vaultSpecificMessage = new clientPB.SecretRenameMessage();
  const vaultMessage = new clientPB.VaultMessage();
  const oldSecretMessage = new clientPB.SecretMessage();
  const newSecretMessage = new clientPB.SecretMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const secretPath: string = options.secretPath;
    if (!binUtils.pathRegex.test(secretPath)) {
      throw new CLIErrors.ErrorSecretPathFormat();
    }
    const [, vaultName, secretName] = secretPath.match(binUtils.pathRegex)!;

    vaultMessage.setName(vaultName);
    vaultSpecificMessage.setVault(vaultMessage);

    oldSecretMessage.setName(secretName);
    vaultSpecificMessage.setOldname(oldSecretMessage);

    newSecretMessage.setName(options.secretName);
    vaultSpecificMessage.setNewname(newSecretMessage);

    const pCall = grpcClient.vaultsRenameSecret(vaultSpecificMessage, meta);

    const responseMessage = await pCall;
    if (responseMessage.getSuccess()) {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Renamed secret: ${oldSecretMessage.getName()} in vault: ${vaultMessage.getName()} to ${newSecretMessage.getName()}`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [`Failed to renamed secret: ${vaultMessage.getName()}`],
        }),
      );
    }
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

export default commandRenameSecret;
