import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandGet extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('get');
    this.description('Retrieve a Secret from the Given Vault');
    this.argument(
      '<secretPath>',
      'Path to where the secret to be retrieved, specified as <vaultName>:<directoryPath>',
      parsers.parseSecretPath,
    );
    this.option(
      '-e, --env',
      'Wrap the secret in an environment variable declaration',
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
        const isEnv: boolean = options.env ?? false;
        const secretMessage = new secretsPB.Secret();
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(secretPath[0]);
        secretMessage.setVault(vaultMessage);
        secretMessage.setSecretName(secretPath[1]);

        const response = await binUtils.retryAuth(
          (auth?: Metadata) => grpcClient.vaultsSecretsGet(secretMessage, auth),
          meta,
        );

        if (isEnv) {
          process.stdout.write(
            binUtils.outputFormatter({
              type: options.format === 'json' ? 'json' : 'list',
              data: [
                `Export ${secretMessage
                  .getSecretName()
                  .toUpperCase()
                  .replace('-', '_')}='${response.getSecretName()}`,
              ],
            }),
          );
        } else {
          process.stdout.write(
            binUtils.outputFormatter({
              type: options.format === 'json' ? 'json' : 'list',
              data: [
                `${secretMessage.getSecretName()}:\t\t${response.getSecretName()}`,
              ],
            }),
          );
        }
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandGet;
