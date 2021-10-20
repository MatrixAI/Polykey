import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { messages, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const list = binUtils.createCommand('list', {
  description: 'Lists all available secrets for a given vault',
  aliases: ['ls', 'l'],
  nodePath: true,
  verbose: true,
  format: true,
});
list.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) Name of the vault to list the secret(s) from',
);
list.action(async (options) => {
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

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    vaultMessage.setNameOrId(options.vaultName);

    const secretListGenerator = grpcClient.vaultsSecretsList(vaultMessage);
    const { p, resolveP } = utils.promise();
    secretListGenerator.stream.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    const data: Array<string> = [];
    for await (const secret of secretListGenerator) {
      data.push(`${secret.getSecretName()}`);
    }
    await p;

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: data,
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

export default list;
