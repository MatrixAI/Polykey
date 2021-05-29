import * as grpcErrors from '../../grpc/errors';
import * as clientErrors from '../../client/errors';
import PolykeyClient from '../../PolykeyClient';
import { clientPB } from '../../client';
import { createCommand, outputFormatter } from '../utils';
import { getDefaultNodePath } from '../../utils';
import * as grpc from '@grpc/grpc-js';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

const commandCreateVault = createCommand('create', {
  description: 'Creates a new vault',
  aliases: ['touch', 'new'],
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandCreateVault.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) unique name of the new vault',
);
commandCreateVault.action(async (options) => {
  const meta = new grpc.Metadata();

  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  if (options.passwordFile) {
    meta.set('passwordFile', options.passwordFile);
  }
  clientConfig['nodePath'] = options.nodePath ? options.nodePath : getDefaultNodePath();

  const client = new PolykeyClient(clientConfig);
  const vaultMessage = new clientPB.VaultMessage();
  vaultMessage.setName(options.vaultName);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const pCall = grpcClient.vaultsCreate(vaultMessage, meta);

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
    if (err instanceof clientErrors.ErrorClientPasswordNotProvided) {
      process.stderr.write(`${err.message}\nUse --password-file <file>\n`);
    } else if (err instanceof grpcErrors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    } else if (err instanceof grpcErrors.ErrorGRPCServerNotStarted) {
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
    options.passwordFile = undefined;
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;  }
});

export default commandCreateVault;
