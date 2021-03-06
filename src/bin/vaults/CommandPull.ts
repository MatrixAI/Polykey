import type PolykeyClient from '../../PolykeyClient';
import type { NodeId } from '../../nodes/types';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';
import * as binParsers from '../utils/parsers';

class CommandPull extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('pull');
    this.description('Pull a Vault from Another Node');
    this.argument('<vaultNameOrId>', 'Name of the vault to be pulled into');
    this.argument(
      '[targetNodeId]',
      '(Optional) target node to pull from',
      binParsers.parseNodeId,
    );
    this.addOption(binOptions.pullVault);
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(
      async (vaultNameOrId, targetNodeId: NodeId | undefined, options) => {
        const { default: PolykeyClient } = await import('../../PolykeyClient');
        const nodesUtils = await import('../../nodes/utils');
        const vaultsPB = await import(
          '../../proto/js/polykey/v1/vaults/vaults_pb'
        );
        const nodesPB = await import(
          '../../proto/js/polykey/v1/nodes/nodes_pb'
        );
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
          const pullVaultMessage = new vaultsPB.Vault();
          const nodeMessage = new nodesPB.Node();
          const vaultPullMessage = new vaultsPB.Pull();
          vaultPullMessage.setVault(vaultMessage);
          vaultMessage.setNameOrId(vaultNameOrId);
          if (targetNodeId != null) {
            nodeMessage.setNodeId(nodesUtils.encodeNodeId(targetNodeId));
            vaultPullMessage.setNode(nodeMessage);
          }
          if (options.pullVault) {
            vaultPullMessage.setPullVault(pullVaultMessage);
            pullVaultMessage.setNameOrId(options.pullVault);
          }
          await binUtils.retryAuthentication(
            (auth) => pkClient.grpcClient.vaultsPull(vaultPullMessage, auth),
            meta,
          );
        } finally {
          if (pkClient! != null) await pkClient.stop();
        }
      },
    );
  }
}

export default CommandPull;
