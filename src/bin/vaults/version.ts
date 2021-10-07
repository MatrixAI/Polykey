import { clientPB, utils as clientUtils } from '../../client';
import { createCommand, outputFormatter } from '../utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { errors } from '../../grpc';
import * as utils from '../../utils';
import { isVaultId } from '../../vaults/utils'

const version = createCommand('version', {
  description: {
    description: `Sets the vault to a certain version of it's history`,
    args: {
      vault: 'Name or ID of the vault',
      versionId: 'ID of the version you want to switch to',
    },
  },
  verbose: true,
  format: true,
  nodePath: true,
});
version.arguments('<vault> <versionId>');
version.alias('ver');
version.action(async (vault, versionId, options) => {
  const clientConfig = {};
  clientConfig['logger'] = new Logger('CLI Logger', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  if (options.verbose) {
    clientConfig['logger'].setLevel(LogLevel.DEBUG);
  }
  clientConfig['nodePath'] = options.nodePath
    ? options.nodePath
    : utils.getDefaultNodePath();

  const client = await PolykeyClient.createPolykeyClient(clientConfig);

  try {
    //Starting client
    await client.start({});
    const grpcClient = client.grpcClient;

    const vaultMessage = new clientPB.VaultMessage();
    const vaultsVersionMessage = new clientPB.VaultsVersionMessage();

    // check if vault ID or Name was provided.
    if(isVaultId(vault)) vaultMessage.setVaultId(vault);
    else vaultMessage.setVaultName(vault);

    vaultsVersionMessage.setVault(vaultMessage);
    vaultsVersionMessage.setVersionId(versionId);

    const statusMessage = await grpcClient.vaultsVersion(vaultsVersionMessage);

    let successMessage: string;
    if(statusMessage.getSuccess()) successMessage = 'PLACEHOLDER SUCCEEDED';
    else throw Error('PLACEHOLDER FAILED');

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: [successMessage],
      }),
    );
  } catch (err) {
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      process.stderr.write(`${err.message}\n`);
    }
    if (err instanceof errors.ErrorGRPCServerNotStarted) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stderr.write(
        outputFormatter({
          type: options.format === 'json' ? 'json' : 'list',
          data: ['Error:', err.message],
        }),
      );
    }
    throw err;
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default version;
