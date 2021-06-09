import { errors } from '../../grpc';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { clientPB } from '../../client';
import PolykeyClient from '../../PolykeyClient';
import { createCommand, outputFormatter } from '../utils';

// TODO: once this can be tested then the environment option needs to be handled

const commandGetSecret = createCommand('get', {
  description: {
    description: 'Retrieves a secret from a given vault',
    args: {
      vaultId: 'ID of the vault',
      secretPath: 'Path to the secret to retreive',
    },
  },
  nodePath: true,
  verbose: true,
  format: true,
});
commandGetSecret.requiredOption(
  '-vi, --vault-id <vaultId>',
  '(required) Id of the vault to get the secret from',
);
commandGetSecret.requiredOption(
  '-sp, --secret-path <secretPath>',
  '(required) Path to the secret to get',
);
commandGetSecret.option(
  '-e, --env',
  'Wrap the secret in an environment variable declaration',
);
commandGetSecret.action(async (options) => {
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

    const pCall = grpcClient.vaultsGetSecret(vaultSpecificMessage);

    const responseMessage = await pCall;
    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `${vaultSpecificMessage.getName()}:\t\t${responseMessage.getName()}`,
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

export default commandGetSecret;
