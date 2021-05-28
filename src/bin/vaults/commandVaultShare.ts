import { errors } from '@/grpc';
import { clientPB } from '../../client';
import { createCommand, outputFormatter } from '../utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';

const commandVaultShare = createCommand('share', {
  description: {
    description: 'Shares vaults with an identity',
    args: {
      vaultName: 'Name of the vault to share. List vaults with "ls" or "list"',
      identity: 'Identity to share the vault with',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandVaultShare.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) Name of the vault to share',
);
commandVaultShare.requiredOption(
  '-id, --identity <identity>',
  '(required) Identity to share vault with',
);
commandVaultShare.action(async (options) => {
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

export default commandVaultShare;
