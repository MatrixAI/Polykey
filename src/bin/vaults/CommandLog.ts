import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

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

      const client = await PolykeyClient.createPolykeyClient({
        nodePath: options.nodePath,
        logger: this.logger.getChild(PolykeyClient.name),
      });

      const meta = await parsers.parseAuth({
        passwordFile: options.passwordFile,
        fs: this.fs,
      });

      try {
        const grpcClient = client.grpcClient;
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vault);
        const vaultsLogMessage = new vaultsPB.Log();
        vaultsLogMessage.setVault(vaultMessage);
        vaultsLogMessage.setLogDepth(options.depth);
        vaultsLogMessage.setCommitId(options.commitId ?? '');

        const data = await binUtils.retryAuth(async (meta: Metadata) => {
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
        }, meta);
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: data,
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandLog;
