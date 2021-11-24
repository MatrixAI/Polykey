import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandDir extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('dir');
    this.description('Add a Directory of Secrets within a Given Vault');
    this.argument(
      '<directoryPath>',
      'On disk path to the directory containing the secrets to be added',
    );
    this.argument('<vaultName>', 'Name of the vault to add the secrets to');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (directoryPath, vaultName, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const vaultsPB = await import(
        '../../proto/js/polykey/v1/vaults/vaults_pb'
      );
      const secretsPB = await import(
        '../../proto/js/polykey/v1/secrets/secrets_pb'
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
        const secretDirectoryMessage = new secretsPB.Directory();
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vaultName);
        secretDirectoryMessage.setVault(vaultMessage);
        secretDirectoryMessage.setSecretDirectory(directoryPath);

        await binUtils.retryAuth(
          (auth?: Metadata) =>
            grpcClient.vaultsSecretsNewDir(secretDirectoryMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Secret directory added to vault: ${secretDirectoryMessage.getSecretDirectory()}`,
            ],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandDir;
