import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandDelete extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('delete');
    this.aliases(['del', 'rm']);
    this.description('Delete a Secret from a Specified Vault');
    this.argument(
      '<secretPath>',
      'Path to the secret that to be deleted, specified as <vaultName>:<directoryPath>',
      parsers.parseSecretPath,
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (secretPath, options) => {
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
        vaultMessage.setNameOrId(secretPath[0]);
        secretMessage.setVault(vaultMessage);
        secretMessage.setSecretName(secretPath[1]);

        await binUtils.retryAuth(
          (auth?: Metadata) =>
            grpcClient.vaultsSecretsDelete(secretMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Secret: ${secretMessage.getSecretName()} in vault: ${vaultMessage.getNameOrId()} successfully deleted`,
            ],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandDelete;
