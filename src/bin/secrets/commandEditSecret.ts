import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as CLIErrors from '../errors';
import * as grpcErrors from '../../grpc/errors';

const commandEditSecret = binUtils.createCommand('edit', {
  description: 'Edits a secret with the default system editor',
  aliases: ['ed'],
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandEditSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to be edited, specified as <vaultName>:<secretPath>',
);
commandEditSecret.action(async (options) => {
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

    const pCall = await grpcClient.vaultsGetSecret(vaultSpecificMessage, meta);

    const secretContent = pCall.getName();

    // Linux
    const tmpDir = fs.mkdtempSync(`${os.tmpdir}/pksecret`);
    const tmpFile = `${tmpDir}/pkSecretFile`;

    fs.writeFileSync(tmpFile, secretContent);

    execSync(`$EDITOR \"${tmpFile}\"`, { stdio: 'inherit' });

    const content = fs.readFileSync(tmpFile, { encoding: 'utf-8' });

    secretMessage.setVault(vaultSpecificMessage);
    secretMessage.setContent(content);
    await grpcClient.vaultsEditSecret(
      secretMessage,
      meta,
      await client.session.createJWTCallCredentials(),
    );

    fs.rmdirSync(tmpDir, { recursive: true });

    // Windows
    // TODO: complete windows impl

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Edited secret: ${vaultMessage.getName()} in vault: ${vaultMessage.getName()}`,
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

export default commandEditSecret;
