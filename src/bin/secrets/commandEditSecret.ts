import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB, utils as clientUtils } from '../../client';
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
});
commandEditSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to be edited, specified as <vaultName>:<secretPath>',
);
commandEditSecret.action(async (options) => {
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

  const client = new PolykeyClient(clientConfig);
  const secretEditMessage = new clientPB.SecretEditMessage();
  const secretMessage = new clientPB.SecretMessage();
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
    secretMessage.setVault(vaultMessage);
    secretMessage.setName(secretName);
    secretEditMessage.setSecret(secretMessage);

    const pCall = grpcClient.vaultsGetSecret(
      secretEditMessage,
      await client.session.createCallCredentials(),
    );
    pCall.call.on('metadata', (meta) => {
      clientUtils.refreshSession(meta, client.session);
    });
    const response = await pCall;

    const secretContent = response.getName();

    // Linux
    const tmpDir = fs.mkdtempSync(`${os.tmpdir}/pksecret`);
    const tmpFile = `${tmpDir}/pkSecretFile`;

    fs.writeFileSync(tmpFile, secretContent);

    execSync(`$EDITOR \"${tmpFile}\"`, { stdio: 'inherit' });

    const content = fs.readFileSync(tmpFile, { encoding: 'utf-8' });

    secretMessage.setVault(vaultMessage);
    secretMessage.setContent(content);
    await grpcClient.vaultsEditSecret(
      secretEditMessage,
      await client.session.createCallCredentials(),
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
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandEditSecret;
