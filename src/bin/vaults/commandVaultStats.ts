import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import PolykeyClient from '../../PolykeyClient';
import { clientPB } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandVaultStats = binUtils.createCommand('stat', {
  description: 'Gets stats of an existing vault',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandVaultStats.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) Name of the vault to get stats from',
);
commandVaultStats.action(async (options) => {
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
  const vaultMessage = new clientPB.VaultMessage();
  vaultMessage.setName(options.vaultName);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const responseMessage = await grpcClient.vaultsStat(vaultMessage, meta);

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`${vaultMessage.getId()}:\t\t${responseMessage.getStats()}`],
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

export default commandVaultStats;
