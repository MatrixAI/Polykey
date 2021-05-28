import { errors } from '@/grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandDeleteSecret = createCommand('delete', {
  description: {
    description: 'Deletes a secret from a specified vault',
    args: {
      vaultId: 'ID of the vault that the secret is in',
      secretPath: 'Path to secret to be deleted',
    },
  },
  aliases: ['rm'],
  nodePath: true,
  verbose: true,
  format: true,
});
commandDeleteSecret.requiredOption(
  '-vi --vault-id <vaultId>',
  '(required) Id of the vault that the secret is in',
);
commandDeleteSecret.requiredOption(
  '-sp --secret-path <secretPath>',
  '(required) Path to the secret to be deleted',
);
commandDeleteSecret.action(async (options) => {
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
    vaultSpecificMessage.setVault(vaultMessage);
    vaultSpecificMessage.setName(options.secretPath);

    const pCall = grpcClient.vaultsDeleteSecret(vaultSpecificMessage);

    const responseMessage = await pCall;
    if (responseMessage.getSuccess()) {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Secret: ${vaultSpecificMessage.getName()} in vault: ${vaultMessage.getId()} successfully deleted`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Failed to delete secret: ${vaultSpecificMessage.getName()} in vault: ${vaultMessage.getId()}`,
          ],
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

export default commandDeleteSecret;
