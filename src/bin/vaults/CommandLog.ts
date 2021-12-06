import type { Metadata } from '@grpc/grpc-js';

import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandLog extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('log');
    this.description('Get the Version History of a Vault');
    this.argument('<vaultName>', 'Name of the vault to obtain the log from');
    this.option(
      '-ci, --commit-id [commitId]',
      'Id for a specific commit to read from',
    );
    this.option('-d, --depth [depth]', 'The number of commits to retreive');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (vault, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const vaultsPB = await import(
        '../../proto/js/polykey/v1/vaults/vaults_pb'
      );

      const clientOptions = await binProcessors.processClientOptions(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );

      let pkClient: PolykeyClient | undefined;
      this.exitHandlers.handlers.push(async () => {
        if (pkClient != null) await pkClient.stop();
      });
      try {
        pkClient = await PolykeyClient.createPolykeyClient({
          nodePath: options.nodePath,
          nodeId: clientOptions.nodeId,
          host: clientOptions.clientHost,
          port: clientOptions.clientPort,
          logger: this.logger.getChild(PolykeyClient.name),
        });

        const meta = await binProcessors.processAuthentication(
          options.passwordFile,
          this.fs,
        );
        const grpcClient = pkClient.grpcClient;
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vault);
        const vaultsLogMessage = new vaultsPB.Log();
        vaultsLogMessage.setVault(vaultMessage);
        vaultsLogMessage.setLogDepth(options.depth);
        vaultsLogMessage.setCommitId(options.commitId ?? '');

        const data = await binUtils.retryAuthentication(
          async (meta: Metadata) => {
            const data: Array<string> = [];
            const stream = grpcClient.vaultsLog(vaultsLogMessage, meta);
            for await (const commit of stream) {
              const timeStamp = commit.getTimeStamp();
              const date = new Date(timeStamp);
              data.push(`commit ${commit.getOid()}`);
              data.push(`committer ${commit.getCommitter()}`);
              data.push(`Date: ${date.toDateString()}`);
              data.push(`${commit.getMessage()}`);
            }
            return data;
          },
          meta,
        );
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: data,
          }),
        );
      } finally {
        if (pkClient != null) await pkClient.stop();
      }
    });
  }
}

export default CommandLog;
