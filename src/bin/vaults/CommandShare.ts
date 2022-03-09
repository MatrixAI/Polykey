import type PolykeyClient from '../../PolykeyClient';
import type { NodeId } from '../../nodes/types';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';
import * as binParsers from '../utils/parsers';

class CommandShare extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('share');
    this.description('Set the Permissions of a Vault for a Node');
    this.argument('<vaultName>', 'Name of the vault to be shared');
    this.argument(
      '<nodeId>',
      'Id of the node to share to',
      binParsers.parseNodeId,
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (vaultName, nodeId: NodeId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const nodesUtils = await import('../../nodes/utils');
      const vaultsPB = await import(
        '../../proto/js/polykey/v1/vaults/vaults_pb'
      );
      const nodesPB = await import('../../proto/js/polykey/v1/nodes/nodes_pb');
      const clientOptions = await binProcessors.processClientOptions(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );
      const meta = await binProcessors.processAuthentication(
        options.passwordFile,
        this.fs,
      );
      let pkClient: PolykeyClient;
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
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vaultName);
        const nodeMessage = new nodesPB.Node();
        nodeMessage.setNodeId(nodesUtils.encodeNodeId(nodeId));
        const vaultsPermissionsList = new vaultsPB.Permissions();
        vaultsPermissionsList.setVault(vaultMessage);
        vaultsPermissionsList.setNode(nodeMessage);
        vaultsPermissionsList.setVaultPermissionsList(['pull', 'clone']);
        await binUtils.retryAuthentication(
          (auth) =>
            pkClient.grpcClient.vaultsPermissionSet(
              vaultsPermissionsList,
              auth,
            ),
          meta,
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandShare;
