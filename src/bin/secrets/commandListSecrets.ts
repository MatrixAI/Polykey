import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandListSecrets = createCommand('list', {
  description: {
    description: 'Lists all available secrets for a given vault',
    args: {
      vaultId: 'Id of the vault which will have secrets listed',
    },
  },
  aliases: ['ls'],
  nodePath: true,
  verbose: true,
  format: true,
});
commandListSecrets.requiredOption(
  '-vi, --vault-id <vaultId>',
  '(required) Id of the vault to list the secret(s) from',
);
commandListSecrets.action(async (options) => {
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

    const secretListGenerator = grpcClient.vaultsListSecrets(vaultMessage);

    const data: Array<string> = [];
    for await (const secret of secretListGenerator) {
      data.push(`${secret.getName()}`);
    }

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: data,
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

export default commandListSecrets;
