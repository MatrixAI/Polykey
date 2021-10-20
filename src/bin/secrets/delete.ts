import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { messages, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const deleteSecret = binUtils.createCommand('delete', {
  description: 'Deletes a secret from a specified vault',
  aliases: ['rm'],
  nodePath: true,
  verbose: true,
  format: true,
});
deleteSecret.requiredOption(
  '-sp --secret-path <secretPath>',
  '(required) Path to the secret to be deleted, specified as <vaultName>:<secretPath>',
);
deleteSecret.action(async (options) => {
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
  const vaultMessage = new messages.vaults.Vault();
  const secretMessage = new messages.secrets.Secret();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const secretPath: string = options.secretPath;
    if (!binUtils.pathRegex.test(secretPath)) {
      throw new CLIErrors.ErrorSecretPathFormat();
    }
    const [, vaultName, secretName] = secretPath.match(binUtils.pathRegex)!;

    vaultMessage.setNameOrId(vaultName);
    secretMessage.setVault(vaultMessage);
    secretMessage.setSecretName(secretName);

    const pCall = grpcClient.vaultsSecretsDelete(secretMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    const responseMessage = await pCall;
    await p;
    if (responseMessage.getSuccess()) {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Secret: ${secretMessage.getSecretName()} in vault: ${vaultMessage.getNameOrId()} successfully deleted`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Failed to delete secret: ${secretMessage.getSecretName()} in vault: ${vaultMessage.getNameOrId()}`,
          ],
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
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default deleteSecret;
