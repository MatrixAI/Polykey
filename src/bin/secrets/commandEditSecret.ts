import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';

import { errors } from '@/grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandEditSecret = createCommand('edit', {
  description: {
    description: 'edit a secret with the default system editor',
    args: {
      vaultId: 'ID of the vault that the secret is in',
      secret: 'path to secret to be deleted',
    },
  },
  aliases: ['ed'],
  nodePath: true,
  verbose: true,
  format: true,
});
commandEditSecret.requiredOption(
  '-vi, --vault-id <vaultId>',
  "Id of the vault'",
);
commandEditSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  "secret path'",
);
commandEditSecret.action(async (options) => {
  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  if (options.nodePath) {
    clientConfig['nodePath'] = options.nodePath;
  }

  const client = new PolykeyClient(clientConfig);
  const secretMessage = new clientPB.SecretSpecificMessage();
  const vaultSpecificMessage = new clientPB.VaultSpecificMessage();
  const vaultMessage = new clientPB.VaultMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    vaultMessage.setId(options.vaultId);
    vaultSpecificMessage.setVault(vaultMessage);
    vaultSpecificMessage.setName(options.secretPath);

    const pCall = await grpcClient.vaultsGetSecret(vaultSpecificMessage);

    const secretContent = pCall.getName();

    // Linux
    // make a temp file for editing
    const tmpDir = fs.mkdtempSync(`${os.tmpdir}/pksecret`);
    const tmpFile = `${tmpDir}/pkSecretFile`;
    // write secret to file
    fs.writeFileSync(tmpFile, secretContent);
    // open editor
    execSync(`$EDITOR \"${tmpFile}\"`, { stdio: 'inherit' });
    // send updated secret to polykey
    const content = fs.readFileSync(tmpFile, { encoding: 'utf-8' });
    secretMessage.setVault(vaultSpecificMessage);
    secretMessage.setContent(content);
    await grpcClient.vaultsEditSecret(secretMessage);

    // remove temp directory
    fs.rmdirSync(tmpDir, { recursive: true });

    // Windows
    // TODO: complete windows impl

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Edited secret: ${vaultMessage.getName()} in vault: ${vaultMessage.getId()}`,
        ],
      }),
    );
  } catch (err) {
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    }
    if (err instanceof errors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: ['Error:', err.message],
        }),
      );
    }
  } finally {
    client.stop();
  }
});

export default commandEditSecret;
