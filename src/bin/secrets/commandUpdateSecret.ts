import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const commandUpdateSecret = binUtils.createCommand('update', {
  description: 'Updates a secret within a given vault',
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandUpdateSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to update, specified as <vaultName>:<secretPath>',
);
commandUpdateSecret.requiredOption(
  '-fp, --file-path <filePath>',
  '(required) Path to the file containing the updated secret content',
);
commandUpdateSecret.action(async (options) => {
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
  const secretMessage = new clientPB.SecretSpecificMessage();
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

    const content = fs.readFileSync(options.filePath, { encoding: 'utf-8' });

    secretMessage.setVault(vaultSpecificMessage);
    secretMessage.setContent(content);

    await grpcClient.vaultsEditSecret(
      secretMessage,
      meta,
      await client.session.createJWTCallCredentials(),
    );

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Updated secret: ${vaultSpecificMessage.getName()} in vault: ${vaultMessage.getName()}`,
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

export default commandUpdateSecret;
