import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const update = binUtils.createCommand('update', {
  description: 'Updates a secret within a given vault',
  nodePath: true,
  verbose: true,
  format: true,
});
update.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to update, specified as <vaultName>:<secretPath>',
);
update.requiredOption(
  '-fp, --file-path <filePath>',
  '(required) Path to the file containing the updated secret content',
);
update.action(async (options) => {
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
  const vaultMessage = new clientPB.VaultMessage();
  const secretMessage = new clientPB.SecretMessage();
  const secretEditMessage = new clientPB.SecretEditMessage();
  secretMessage.setVault(vaultMessage);
  secretEditMessage.setSecret(secretMessage);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const secretPath: string = options.secretPath;
    if (!binUtils.pathRegex.test(secretPath)) {
      throw new CLIErrors.ErrorSecretPathFormat();
    }
    const [, vaultName, secretName] = secretPath.match(binUtils.pathRegex)!;

    vaultMessage.setVaultName(vaultName);
    secretMessage.setSecretName(secretName);

    const content = fs.readFileSync(options.filePath, { encoding: 'utf-8' });

    secretMessage.setSecretContent(content);

    const pCall = grpcClient.vaultsSecretsEdit(secretEditMessage);
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
          `Updated secret: ${secretMessage.getSecretName()} in vault: ${vaultMessage.getVaultName()}`,
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

export default update;
