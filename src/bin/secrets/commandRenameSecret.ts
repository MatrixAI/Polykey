import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandRenameSecret = createCommand('rename', {
  description: {
    description: 'Renames a secret from a given vault',
    args: {
      vaultId: 'ID of the vault',
      secretPath: 'Path to the secret to rename',
      secretName: 'The new name of the secret',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandRenameSecret.requiredOption(
  '-vi, --vault-id <vaultId>',
  '(required) Id of the vault in which the secret is contained',
);
commandRenameSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Id of the vault in which the secret is contained',
);
commandRenameSecret.requiredOption(
  '-sn, --secret-name <secretName>',
  '(required) New name of the secret',
);
commandRenameSecret.action(async (options) => {
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
  const vaultSpecificMessage = new clientPB.VaultSpecificMessage();
  const vaultMessage = new clientPB.VaultMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    vaultMessage.setId(options.vaultId);
    vaultMessage.setName(options.secretPath);
    vaultSpecificMessage.setVault(vaultMessage);
    vaultSpecificMessage.setName(options.newSecretName);

    const pCall = grpcClient.vaultsRenameSecret(vaultSpecificMessage);

    const responseMessage = await pCall;
    if (responseMessage.getSuccess()) {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Renamed secret: ${vaultMessage.getName()} in vault: ${vaultMessage.getId()} to ${vaultSpecificMessage.getName()}`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [`Failed to renamed secret: ${vaultMessage.getName()}`],
        }),
      );
    }
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

export default commandRenameSecret;
