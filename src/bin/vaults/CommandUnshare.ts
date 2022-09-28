import type PolykeyClient from '../../PolykeyClient';
import type { NodeId } from '../../ids/types';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';
import * as binParsers from '../utils/parsers';

class CommandUnshare extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('unshare');
    this.description('Unset the Permissions of a Vault for a Node');
    this.argument('<vaultName>', 'Name of the vault to be unshared');
    this.argument(
      '<nodeId>',
      'Id of the node to unshare with',
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
        const vaultsPermissionsMessage = new vaultsPB.Permissions();
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vaultName);
        const nodeMessage = new nodesPB.Node();
        nodeMessage.setNodeId(nodesUtils.encodeNodeId(nodeId));
        vaultsPermissionsMessage.setVault(vaultMessage);
        vaultsPermissionsMessage.setNode(nodeMessage);
        vaultsPermissionsMessage.setVaultPermissionsList(['clone', 'pull']);
        await binUtils.retryAuthentication(
          (auth) =>
            pkClient.grpcClient.vaultsPermissionUnset(
              vaultsPermissionsMessage,
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

export default CommandUnshare;
