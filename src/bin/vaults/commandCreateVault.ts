import { errors } from '../../grpc';
import { clientPB } from '../../client';
import { createCommand, outputFormatter } from '../utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';

const commandCreateVault = createCommand('create', { nodePath: true, verbose: true, format: true });
commandCreateVault.description('Creates a new vault');
commandCreateVault.aliases(['touch', 'new']);
commandCreateVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) unique name of the new vault',
);
commandCreateVault.action(async (options) => {
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
  vaultMessage.setName(options.vaultName);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const pCall = grpcClient.vaultsCreate(vaultMessage);

    const responseMessage = await pCall;
    if (responseMessage.getSuccess()) {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [`Vault ${vaultMessage.getName()} created successfully`],
        }),
      );
    } else {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [`Failed to create vault: ${vaultMessage.getName()}.`],
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

export default commandCreateVault;
