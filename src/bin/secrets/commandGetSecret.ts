import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const commandGetSecret = binUtils.createCommand('get', {
  description: 'Retrieves a secret from a given vault',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandGetSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to get, specified as <vaultName>:<secretPath>',
);
commandGetSecret.option(
  '-e, --env',
  'Wrap the secret in an environment variable declaration',
);
commandGetSecret.action(async (options) => {
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

  const isEnv: boolean = options.env ?? false;

  const client = new PolykeyClient(clientConfig);
  const vaultSpecificMessage = new clientPB.VaultSpecificMessage();
  const vaultMessage = new clientPB.VaultMessage();

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
    vaultSpecificMessage.setName(secretName);

    const pCall = grpcClient.vaultsGetSecret(vaultSpecificMessage, meta);

    const responseMessage = await pCall;
    if (isEnv) {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Export ${vaultSpecificMessage
              .getName()
              .toUpperCase()
              .replace('-', '_')}='${responseMessage.getName()}`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `${vaultSpecificMessage.getName()}:\t\t${responseMessage.getName()}`,
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
    client.stop();
    options.passwordFile = undefined;
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandGetSecret;
