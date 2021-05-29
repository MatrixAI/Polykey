import * as grpcErrors from '../../grpc/errors';
import * as clientErrors from '../../client/errors';
import PolykeyClient from '../../PolykeyClient';
import { clientPB } from '../../client';
import { createCommand, outputFormatter } from '../utils';
import { getDefaultNodePath } from '../../utils';
import * as grpc from '@grpc/grpc-js';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

const commandScanVaults = createCommand('scan', {
  description: 'Lists the vaults of another node',
  aliases: ['fetch'],
  nodePath: true,
  verbose: true,
  format: true,
  passwordFile: true,
});
commandScanVaults.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) Id of the node to be scanned',
);
commandScanVaults.action(async (options) => {
  const meta = new grpc.Metadata();

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
  if (options.passwordFile) {
    meta.set('passwordFile', options.passwordFile);
  }
  clientConfig['nodePath'] = options.nodePath ? options.nodePath : getDefaultNodePath();

  const client = new PolykeyClient(clientConfig);
  const vaultMessage = new clientPB.VaultMessage();
  vaultMessage.setId(options.nodeId);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const data: Array<string> = [];
    const vaultListGenerator = grpcClient.vaultsScan(vaultMessage);
    for await (const vault of vaultListGenerator) {
      data.push(`${vault.getName()}`);
    }
    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: data,
      }),
    );
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
    options.format = undefined;
  }
});

export default commandScanVaults;
