import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../options';
import * as parsers from '../parsers';

class CommandPull extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('pull');
    this.description('Pull a Vault from Another Node');
    this.argument('<nodeId>', 'Id of the node to pull the vault from');
    this.argument('<vaultName>', 'Name of the vault to be pulled');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (nodeId, vaultName, options) => {
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
        const vaultPullMessage = new vaultsPB.Pull();
        vaultPullMessage.setVault(vaultMessage);
        vaultPullMessage.setNode(nodeMessage);
        nodeMessage.setNodeId(nodeId);
        vaultMessage.setNameOrId(vaultName);

        await binUtils.retryAuth(
          (auth?: Metadata) => grpcClient.vaultsPull(vaultPullMessage, auth),
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: [
              `Pull Vault: ${vaultMessage.getNameOrId()} from Node: ${nodeMessage.getNodeId()} successful`,
            ],
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandPull;
