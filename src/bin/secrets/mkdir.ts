import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const mkdir = binUtils.createCommand('mkdir', {
  description: 'Creates a directory within a given vault',
  nodePath: true,
  verbose: true,
  format: true,
});
mkdir.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path of the directory to create, specified as <vaultName>:<secretPath>',
);
mkdir.action(async (options) => {
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
  const vaultMkdirMessage = new clientPB.VaultMkdirMessage();
  const vaultMessage = new clientPB.VaultMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const secretPath: string = options.secretPath;
    if (!binUtils.pathRegex.test(secretPath)) {
      throw new CLIErrors.ErrorSecretPathFormat(
        "Please specify a new secret name using the format: '<vaultName>:<secretPath>'",
      );
    }
    const [, vaultName, secretName] = secretPath.match(binUtils.pathRegex)!;

    vaultMessage.setVaultName(vaultName);
    vaultMkdirMessage.setVault(vaultMessage);
    vaultMkdirMessage.setDirName(secretName);

    const pCall = grpcClient.vaultsSecretsMkdir(vaultMkdirMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    await pCall;
    await p;

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Directory: ${vaultMkdirMessage.getDirName()} created inside vault: ${vaultMessage.getVaultName()}`,
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

export default mkdir;
