import { errors } from '@/grpc';
import { clientPB } from '../../client';
import { createCommand, outputFormatter } from '../utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';

const commandVaultStats = createCommand('stat', {
  description: {
    description: 'Gets stats of an existing vault',
    args: {
      vaultId:
        'ID of the vault to get stats from. List vaults with "ls" or "list"',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandVaultStats.requiredOption(
  '-vi, --vault-id <vaultId>',
  '(required) Id of the vault to get stats from',
);
commandVaultStats.action(async (options) => {
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
  vaultMessage.setId(options.vaultId);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const responseMessage = await grpcClient.vaultsStat(vaultMessage);

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [`${vaultMessage.getId()}:\t\t${responseMessage.getStats()}`],
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
    await client.stop();
  }
});

export default commandVaultStats;
