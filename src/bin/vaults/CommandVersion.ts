import type { Metadata } from '@grpc/grpc-js';

import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandVersion extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('version');
    this.description('Set a Vault to a Particular Version in its History');
    this.argument('<vaultName>', 'Name of the vault to change the version of');
    this.argument('<versionId>', 'Id of the commit that will be changed to');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (vault, versionId, options) => {
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
        const vaultsVersionMessage = new vaultsPB.Version();
        vaultMessage.setNameOrId(vault);
        vaultsVersionMessage.setVault(vaultMessage);
        vaultsVersionMessage.setVersionId(versionId);

        await binUtils.retryAuthentication(
          (auth?: Metadata) =>
            grpcClient.vaultsVersion(vaultsVersionMessage, auth),
          meta,
        );

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
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: successMessage,
          }),
        );
      } finally {
        if (pkClient != null) await pkClient.stop();
      }
    });
  }
}

export default CommandVersion;
