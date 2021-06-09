import fs from 'fs';
import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

const commandCreateSecret = createCommand('create', {
  description: {
    description: 'create a secret within a given vault',
    args: {
      vaultId: 'Id of the vault to add the secret to',
      secretPath: 'Path to add the secret to',
      filePath: 'File path containing the secret to be added',
    },
  },
  aliases: ['touch', 'new'],
  nodePath: true,
  verbose: true,
  format: true,
});
commandCreateSecret.requiredOption(
  '-vi, --vault-id <vaultId>',
  '(required) Id of the vault that the secret will be added to',
);
commandCreateSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path inside the vault that the secret will be added to',
);
commandCreateSecret.requiredOption(
  '-fp, --file-path <filePath>',
  '(required) File path containing the secret to be added',
);
commandCreateSecret.action(async (options) => {
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

    const content = fs.readFileSync(options.filePath, { encoding: 'utf-8' });

    vaultMessage.setId(options.vaultId);
    vaultMessage.setName(options.secretPath);
    vaultSpecificMessage.setVault(vaultMessage);
    vaultSpecificMessage.setName(content);

    const pCall = grpcClient.vaultsNewSecret(vaultSpecificMessage);

    const responseMessage = await pCall;
    if (responseMessage.getSuccess()) {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Secret: ${vaultMessage.getName()} successfully created in vault: ${vaultMessage.getId()}`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Failed to create secret: ${vaultMessage.getName()} in vault: ${vaultMessage.getId()}`,
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

export default commandCreateSecret;
