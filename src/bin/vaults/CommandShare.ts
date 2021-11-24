import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandShare extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('share');
    this.description('Set the Permissions of a Vault for a Node');
    this.argument('<vaultName>', 'Name of the vault to be shared');
    this.argument('<nodeId>', 'Id of the node to share to');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (vaultName, nodeId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const vaultsPB = await import(
        '../../proto/js/polykey/v1/vaults/vaults_pb'
      );
      const nodesPB = await import('../../proto/js/polykey/v1/nodes/nodes_pb');

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
        const nodeMessage = new nodesPB.Node();
        const setVaultPermsMessage = new vaultsPB.PermSet();
        setVaultPermsMessage.setVault(vaultMessage);
        setVaultPermsMessage.setNode(nodeMessage);
        vaultMessage.setNameOrId(vaultName);
        nodeMessage.setNodeId(nodeId);

        await binUtils.retryAuth(
          (auth?: Metadata) =>
            grpcClient.vaultsPermissionsSet(setVaultPermsMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Shared Vault: ${setVaultPermsMessage
                .getVault()
                ?.getNameOrId()} to: ${setVaultPermsMessage
                .getNode()
                ?.getNodeId()}`,
            ],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandShare;
