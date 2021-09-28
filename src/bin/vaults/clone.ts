import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { clientPB, utils as clientUtils } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const clone = binUtils.createCommand('clone', {
  description: 'Clones a vault from another node',
  nodePath: true,
  verbose: true,
  format: true,
});
clone.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) Id of the node to clone the vault from',
);
clone.requiredOption(
  '-vi, --vault-id <vaultId>',
  '(required) Id of the vault to be cloned',
);
clone.action(async (options) => {
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

  const client = await PolykeyClient.createPolykeyClient(clientConfig);
  const vaultMessage = new clientPB.VaultMessage();
  const nodeMessage = new clientPB.NodeMessage();
  const vaultCloneMessage = new clientPB.VaultCloneMessage();
  vaultCloneMessage.setVault(vaultMessage);
  vaultCloneMessage.setNode(nodeMessage);

  nodeMessage.setNodeId(options.nodeId);
  vaultMessage.setVaultId(options.vaultId);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const pCall = grpcClient.vaultsClone(vaultCloneMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    await pCall;
    await p;

    process.stdout.write(
      binUtils.outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [
          `Clone Vault: ${vaultMessage.getVaultName()} from Node: ${nodeMessage.getNodeId()} successful`,
        ],
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

export default clone;
