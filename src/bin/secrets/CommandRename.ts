import type { Metadata } from '@grpc/grpc-js';

import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as parsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';

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
        const secretMessage = new secretsPB.Secret();
        const secretRenameMessage = new secretsPB.Rename();
        secretMessage.setVault(vaultMessage);
        secretRenameMessage.setOldSecret(secretMessage);
        vaultMessage.setNameOrId(secretPath[0]);
        secretMessage.setSecretName(secretPath[1]);
        secretRenameMessage.setNewName(newSecretName);

        await binUtils.retryAuthentication(
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
        if (pkClient != null) await pkClient.stop();
      }
    });
  }
}

export default CommandRename;
