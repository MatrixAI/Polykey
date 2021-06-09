import { errors } from '../../grpc';
import { clientPB } from '../../client';
import { createCommand, outputFormatter } from '../utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';

const commandRenameVault = createCommand('create', { nodePath: true, verbose: true, format: true });
commandRenameVault.description('Renames an existing vault');
commandRenameVault.requiredOption(
  '-vi, -vault-id <vaultId>',
  '(required) Id of the vault to be renamed',
);
commandRenameVault.requiredOption(
  '-vn, -vault-name <vaultName>',
  '(required) New name for the vault',
);
commandRenameVault.action(async (options) => {
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
    vaultMessage.setName(options.vaultName);

    const pCall = grpcClient.vaultsRename(vaultMessage);

    const responseMessage = await pCall;
    if (responseMessage.getSuccess()) {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Renamed vault: ${vaultMessage.getId()} to ${vaultMessage.getName()}`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [`Failed to rename vault: ${vaultMessage.getId()}`],
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

export default commandRenameVault;
