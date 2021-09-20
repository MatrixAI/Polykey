import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { clientPB, utils as clientUtils } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const commandScanVaults = binUtils.createCommand('scan', {
  description: 'Lists the vaults of another node',
  aliases: ['fetch'],
  nodePath: true,
  verbose: true,
  format: true,
});
commandScanVaults.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) Id of the node to be scanned',
);
commandScanVaults.action(async (options) => {
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
  clientConfig['nodePath'] = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();

  const client = new PolykeyClient(clientConfig);
  const nodeMessage = new clientPB.NodeMessage();
  nodeMessage.setNodeId(options.nodeId);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const data: Array<string> = [];
    const vaultListGenerator = grpcClient.vaultsScan(nodeMessage);
    const { p, resolveP } = utils.promise();
    vaultListGenerator.stream.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });
    for await (const vault of vaultListGenerator) {
      data.push(`${vault.getVaultName()}`);
    }
    await p;
    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: data,
      }),
    );
  } catch (err) {
    if (err instanceof grpcErrors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    } else if (err instanceof grpcErrors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stderr.write(
        binUtils.outputFormatter({
          type: 'error',
          description: err.description,
          message: err.message,
        }),
      );
      throw err;
    }
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default commandScanVaults;
