import fs from 'fs';
import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandUpdateSecret = createCommand('update', {
  description: {
    description: `Updates a secret within a given vault`,
    args: {
      vaultId: 'ID of the vault that the secret is in',
      secretPath: 'path to secret to be updated',
      newSecretPath: 'path to updated secret content',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandUpdateSecret.requiredOption(
  '-vi, --vault-id <vaultId>',
  '(required) Id of the vault which contains the secret',
);
commandUpdateSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to update',
);
commandUpdateSecret.requiredOption(
  '-fp, --file-path <filePath>',
  '(required) Path to the file containing the updated secret content',
);
commandUpdateSecret.arguments('<vaultId> <secretPath> <filePath>');
commandUpdateSecret.action(async (options) => {
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

    const content = fs.readFileSync(options.filePath, { encoding: 'utf-8' });

    secretMessage.setVault(vaultSpecificMessage);
    secretMessage.setContent(content);

    await grpcClient.vaultsEditSecret(secretMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Updated secret: ${vaultSpecificMessage.getName()} in vault: ${vaultMessage.getId()}`,
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

export default commandUpdateSecret;
