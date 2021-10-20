import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { utils as clientUtils } from '../../client';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as secretsPB from '../../proto/js/polykey/v1/secrets/secrets_pb';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const get = binUtils.createCommand('get', {
  description: 'Retrieves a secret from a given vault',
  nodePath: true,
  verbose: true,
  format: true,
});
get.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to get, specified as <vaultName>:<secretPath>',
);
get.option(
  '-e, --env',
  'Wrap the secret in an environment variable declaration',
);
get.action(async (options) => {
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

  const isEnv: boolean = options.env ?? false;

  const client = await PolykeyClient.createPolykeyClient(clientConfig);
  const secretMessage = new secretsPB.Secret();
  const vaultMessage = new vaultsPB.Vault();

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

    const pCall = grpcClient.vaultsSecretsGet(secretMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    const responseMessage = await pCall;
    await p;
    if (isEnv) {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Export ${secretMessage
              .getSecretName()
              .toUpperCase()
              .replace('-', '_')}='${responseMessage.getSecretName()}`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `${secretMessage.getSecretName()}:\t\t${responseMessage.getSecretName()}`,
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
    options.env = undefined;
  }
});

export default get;
