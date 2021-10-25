import { clientPB } from '../../client';
import { createCommand, outputFormatter } from '../utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { errors } from '../../grpc';
import { errors as vaultErrors } from '../../vaults';
import * as utils from '../../utils';
// Import { isVaultId } from "../../vaults/utils";

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

    vaultMessage.setNameOrId(vault);
    vaultsVersionMessage.setVault(vaultMessage);
    vaultsVersionMessage.setVersionId(versionId);

    await grpcClient.vaultsVersion(vaultsVersionMessage);

    let successMessage = [`Vault ${vault} is now at version ${versionId}.`];

    if (versionId.toLowerCase() === 'last') {
      successMessage = [`Vault ${vault} is now at the latest version.`];
    }

    /**
     * Previous status message:
     * ---
     * Note: any changes made to the contents of the vault while at this version
     * will discard all changes applied to the vault in later versions. You will
     * not be able to return to these later versions if changes are made.
     */

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: successMessage,
      }),
    );
  } catch (err) {
    let data: string[];
    if (err instanceof errors.ErrorGRPCClientTimeout) {
      data = ['Error:', err.message];
    } else if (err instanceof errors.ErrorGRPCServerNotStarted) {
      data = ['Error:', err.message];
    } else if (err instanceof vaultErrors.ErrorVaultCommitUndefined) {
      // Warning that the versionId was invalid
      data = [
        `Error: ${err.message}`,
        `The VersionID provided was invalid or not in the version history.`,
      ];
    } else if (err instanceof vaultErrors.ErrorVaultUndefined) {
      data = [`Error: ${err.message}`, `The VaultId was invalid or not found.`];
    } else {
      data = ['Error:', err.message];
    }
    process.stderr.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data,
      }),
    );
    throw err;
  } finally {
    await client.stop();
    options.nodePath = undefined;
    options.verbose = undefined;
    options.format = undefined;
  }
});

export default version;
