import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

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
        const nodeMessage = new nodesPB.Node();
        const setVaultPermsMessage = new vaultsPB.PermSet();
        setVaultPermsMessage.setVault(vaultMessage);
        setVaultPermsMessage.setNode(nodeMessage);
        vaultMessage.setNameOrId(vaultName);
        nodeMessage.setNodeId(nodeId);
        await binUtils.retryAuthentication(
          (auth) =>
            pkClient.grpcClient.vaultsPermissionsSet(setVaultPermsMessage, auth),
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
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandShare;
