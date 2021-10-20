import { clientPB } from '../../client';
import { createCommand, outputFormatter } from '../utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyClient from '../../PolykeyClient';
import { errors } from '../../grpc';
import { errors as vaultErrors } from '../../vaults';
import * as utils from '../../utils';
// import { isVaultId } from "../../vaults/utils";

const log = createCommand('log', {
  description: {
    description: `Gets the version history of a vault`,
    args: {
      vault: 'Name or ID of the vault',
      commitId: 'Id for a specific commit to read from.',
    },
  },
  verbose: true,
  format: true,
  nodePath: true,
});
log.arguments('<vault> [commitId]');
log.option('-n --number <number>', 'Number of entries to read');
log.action(async (vault, commitId, options) => {
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
    vaultMessage.setNameOrId(vault);

    const vaultsLogMessage = new clientPB.VaultsLogMessage();
    vaultsLogMessage.setVault(vaultMessage);
    vaultsLogMessage.setLogDepth(options.number);
    vaultsLogMessage.setCommitId(commitId?? '');

    const output: string[] = [];
    const log = await grpcClient.vaultsLog(vaultsLogMessage);

    for await (const entry of log) {
      const timeStamp = entry.getTimeStamp();
      const date = new Date(timeStamp);
      output.push(`commit ${entry.getOid()}`);
      output.push(`committer ${entry.getCommitter()}`);
      output.push(`Date: ${date.toDateString()}`);
      output.push(`${entry.getMessage()}`);
    }

    process.stdout.write(
      outputFormatter({
        type: options.format === 'json' ? 'json' : 'list',
        data: output,
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
      data =  [
        `Error: ${err.message}`,
        `The VersionID provided was invalid or not in the version history.`
      ];
    } else if (err instanceof vaultErrors.ErrorVaultUndefined) {
      data = [
        `Error: ${err.message}`,
        `The VaultId was invalid or not found.`
      ]
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

export default log;
