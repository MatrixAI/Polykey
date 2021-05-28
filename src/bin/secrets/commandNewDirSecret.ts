import { errors } from '@/grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

// TODO: Recursively read in secrets from directory provided

const commandNewDirSecret = createCommand('dir', {
  description: {
    description: `Adds a directory of secrets within a given vault`,
    args: {
      vaultId: 'Id of the vault to which the secret(s) will be added',
      directoryPath: 'Path to the directory of secret(s) to be added',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandNewDirSecret.requiredOption(
  '-vi, --vault-id <vaultId>',
  '(required) Id of the vault to put secret(s) in',
);
commandNewDirSecret.requiredOption(
  '-dp, --directory-path <directoryPath>',
  '(required) Path to the directory of secrets to add',
);
commandNewDirSecret.action(async (options) => {
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
  const vaultMessage = new clientPB.VaultMessage();

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    vaultMessage.setId(options.vaultId);
    vaultMessage.setName(options.directory);

    await grpcClient.vaultsNewDirSecret(vaultMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`newdir...`],
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

export default commandNewDirSecret;
