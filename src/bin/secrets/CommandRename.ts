import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandRename extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('rename');
    this.description('Rename a Secret');
    this.argument(
      '<secretPath>',
      'Path to where the secret to be renamed, specified as <vaultName>:<directoryPath>',
      parsers.parseSecretPath,
    );
    this.argument('<newSecretName>', 'New name of the secret');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (secretPath, newSecretName, options) => {
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
        const vaultMessage = new vaultsPB.Vault();
        const secretMessage = new secretsPB.Secret();
        const secretRenameMessage = new secretsPB.Rename();
        secretMessage.setVault(vaultMessage);
        secretRenameMessage.setOldSecret(secretMessage);
        vaultMessage.setNameOrId(secretPath[0]);
        secretMessage.setSecretName(secretPath[1]);
        secretRenameMessage.setNewName(newSecretName);

        await binUtils.retryAuth(
          (auth?: Metadata) =>
            grpcClient.vaultsSecretsRename(secretRenameMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Renamed secret: ${secretMessage.getSecretName()} in vault: ${vaultMessage.getNameOrId()} to ${secretRenameMessage.getNewName()}`,
            ],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandRename;
