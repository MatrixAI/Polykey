import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { clientPB, utils as clientUtils } from '../../client';
import * as utils from '../../utils';
import * as binUtils from '../utils';
import * as grpcErrors from '../../grpc/errors';

const rename = binUtils.createCommand('rename', {
  description: 'Renames an existing vault',
  nodePath: true,
  verbose: true,
  format: true,
});
rename.requiredOption(
  '-vn, --vault-name <vaultName>',
  '(required) Name of the vault to be renamed',
);
rename.requiredOption(
  '-nn, --new-name <newName>',
  '(required) New name for the vault',
);
rename.action(async (options) => {
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
  const vaultMessage = new clientPB.VaultMessage();
  const vaultRenameMessage = new clientPB.VaultRenameMessage();
  vaultRenameMessage.setVault(vaultMessage);

  try {
    await client.start({});
    const grpcClient = client.grpcClient;

    vaultMessage.setVaultName(options.vaultName);
    vaultRenameMessage.setNewName(options.newName);

    const pCall = grpcClient.vaultsRename(vaultRenameMessage);
    const { p, resolveP } = utils.promise();
    pCall.call.on('metadata', async (meta) => {
      await clientUtils.refreshSession(meta, client.session);
      resolveP(null);
    });

    const responseMessage = await pCall;
    await p;
    if (responseMessage.getVaultId()) {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [
            `Renamed vault: ${vaultMessage.getVaultName()} to ${vaultRenameMessage.getNewName()}`,
          ],
        }),
      );
    } else {
      process.stdout.write(
        binUtils.outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: [`Failed to rename vault: ${vaultMessage.getVaultName()}`],
        }),
      );
    }
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

export default rename;
