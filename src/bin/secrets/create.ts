import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const create = binUtils.createCommand('create', {
  description: 'Creates a secret within a given vault',
  aliases: ['touch', 'new'],
  nodePath: true,
  verbose: true,
  format: true,
});
create.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to be added, specified as <vaultName>:<secretPath>',
);
create.requiredOption(
  '-fp, --file-path <filePath>',
  '(required) File path containing the secret to be added',
);
create.action(async (options) => {
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
  const secretMessage = new clientPB.SecretMessage();
  const vaultMessage = new clientPB.VaultMessage();
  secretMessage.setVault(vaultMessage);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const secretPath: string = options.secretPath;
    if (!binUtils.pathRegex.test(secretPath)) {
      throw new CLIErrors.ErrorSecretPathFormat();
    }
    const [, vaultName, secretName] = secretPath.match(binUtils.pathRegex)!;

    const content = fs.readFileSync(options.filePath);

    vaultMessage.setVaultName(vaultName);
    secretMessage.setSecretName(secretName);
    secretMessage.setSecretContent(content);

    const pCall = grpcClient.vaultsSecretsNew(secretMessage);
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
            `Secret: ${secretMessage.getSecretName()} successfully created in vault: ${vaultMessage.getVaultName()}`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Failed to create secret: ${secretMessage.getSecretName()} in vault: ${vaultMessage.getVaultName()}`,
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

export default create;
