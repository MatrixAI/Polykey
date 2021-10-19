import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { clientPB, utils as clientUtils } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const pull = binUtils.createCommand('pull', {
  description: 'Pulls a vault from another node',
  nodePath: true,
  verbose: true,
  format: true,
});
pull.requiredOption(
  '-ni, --node-id <nodeId>',
  '(required) Id of the node to pull the vault from',
);
pull.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) Name of the vault to be pulled',
);
pull.action(async (options) => {
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
  const vaultPullMessage = new clientPB.VaultPullMessage();
  vaultPullMessage.setVault(vaultMessage);
  vaultPullMessage.setNode(nodeMessage);

  nodeMessage.setNodeId(options.nodeId);
  vaultMessage.setNameOrId(options.vaultName);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    const pCall = grpcClient.vaultsPull(vaultPullMessage);
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
          `Pull Vault: ${vaultMessage.getNameOrId()} from Node: ${nodeMessage.getNodeId()} successful`,
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

export default pull;
