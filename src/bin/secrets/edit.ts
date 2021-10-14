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

const edit = binUtils.createCommand('edit', {
  description: 'Edits a secret with the default system editor',
  aliases: ['ed'],
  nodePath: true,
  verbose: true,
  format: true,
});
edit.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to be edited, specified as <vaultName>:<secretPath>',
);
edit.action(async (options) => {
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

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const secretPath: string = options.secretPath;
    if (!binUtils.pathRegex.test(secretPath)) {
      throw new CLIErrors.ErrorSecretPathFormat();
    }
    const [, vaultName, secretName] = secretPath.match(binUtils.pathRegex)!;

    vaultMessage.setVaultName(vaultName);
    secretMessage.setVault(vaultMessage);
    secretMessage.setSecretName(secretName);

    const pCall = grpcClient.vaultsSecretsGet(secretMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });
    const response = await pCall;
    await p;

    const secretContent = response.getSecretName();

    // Linux
    const tmpDir = fs.mkdtempSync(`${os.tmpdir}/pksecret`);
    const tmpFile = `${tmpDir}/pkSecretFile`;

    fs.writeFileSync(tmpFile, secretContent);

    execSync(`$EDITOR \"${tmpFile}\"`, { stdio: 'inherit' });

    const content = fs.readFileSync(tmpFile);

    secretMessage.setVault(vaultMessage);
    secretMessage.setSecretContent(content);
    await grpcClient.vaultsSecretsEdit(
      secretMessage,
      await client.session.createCallCredentials(),
    );

    fs.rmdirSync(tmpDir, { recursive: true });

    // Windows
    // TODO: complete windows impl

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Edited secret: ${vaultMessage.getVaultName()} in vault: ${vaultMessage.getVaultName()}`,
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

export default edit;
