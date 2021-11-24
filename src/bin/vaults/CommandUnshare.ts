import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandUnshare extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('unshare');
    this.description('Unset the Permissions of a Vault for a Node');
    this.argument('<vaultName>', 'Name of the vault to be unshared');
    this.argument('<nodeId>', 'Id of the node to unshare with');
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
        const unsetVaultPermsMessage = new vaultsPB.PermUnset();
        const vaultMessage = new vaultsPB.Vault();
        const nodeMessage = new nodesPB.Node();
        unsetVaultPermsMessage.setVault(vaultMessage);
        unsetVaultPermsMessage.setNode(nodeMessage);
        vaultMessage.setNameOrId(vaultName);
        nodeMessage.setNodeId(nodeId);

        await binUtils.retryAuth(
          (auth?: Metadata) =>
            grpcClient.vaultsPermissionsUnset(unsetVaultPermsMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Unshared Vault: ${unsetVaultPermsMessage
                .getVault()
                ?.getNameOrId()} to: ${unsetVaultPermsMessage
                .getNode()
                ?.getNodeId()}`,
            ],
          }),
        );
      } finally {
        await client.start();
      }
    });
  }
}

export default CommandUnshare;
