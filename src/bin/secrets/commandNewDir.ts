import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandNewDir = createCommand('mkdir', {
  description: {
    description: `Creates a directory within a given vault`,
    args: {
      vaultId: 'Id of the vault',
      directoryPath: 'Directory path to be created',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandNewDir.requiredOption(
  '-vi, --vault-id <vaultId>',
  '(required) Id of the vault to create the directory within',
);
commandNewDir.requiredOption(
  '-dp, --directory-path <directoryPath>',
  '(required) Path of the directory to create',
);
commandNewDir.action(async (options) => {
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
    vaultSpecificMessage.setName(options.directory);

    await grpcClient.vaultsMkdir(vaultSpecificMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Directory: ${vaultSpecificMessage.getName()} created inside vault: ${vaultMessage.getId()}`,
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

export default commandNewDir;
