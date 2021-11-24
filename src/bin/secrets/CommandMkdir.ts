import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandMkdir extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('mkdir');
    this.description('Create a Directory within a Vault');
    this.argument(
      '<secretPath>',
      'Path to where the directory to be created, specified as <vaultName>:<directoryPath>',
      parsers.parseSecretPath,
    );
    this.option('-r, --recursive', 'Create the directory recursively');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (secretPath, options) => {
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
        const vaultMkdirMessage = new vaultsPB.Mkdir();
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(secretPath[0]);
        vaultMkdirMessage.setVault(vaultMessage);
        vaultMkdirMessage.setDirName(secretPath[1]);
        vaultMkdirMessage.setRecursive(options.recursive);

        await binUtils.retryAuth(
          (auth?: Metadata) =>
            grpcClient.vaultsSecretsMkdir(vaultMkdirMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Directory: ${vaultMkdirMessage.getDirName()} created inside vault: ${vaultMessage.getNameOrId()}`,
            ],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandMkdir;
