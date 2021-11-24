import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandClone extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('clone');
    this.description('Clone a Vault from Another Node');
    this.argument('<vaultNameOrId>', 'Id of the vault to be cloned');
    this.argument('<nodeId>', 'Id of the node to clone the vault from');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (vaultNameOrId, nodeId, options) => {
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
        const vaultCloneMessage = new vaultsPB.Clone();
        vaultCloneMessage.setVault(vaultMessage);
        vaultCloneMessage.setNode(nodeMessage);
        nodeMessage.setNodeId(nodeId);
        vaultMessage.setNameOrId(vaultNameOrId);

        await binUtils.retryAuth(
          (auth?: Metadata) => grpcClient.vaultsClone(vaultCloneMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Clone Vault: ${vaultMessage.getNameOrId()} from Node: ${nodeMessage.getNodeId()} successful`,
            ],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandClone;
