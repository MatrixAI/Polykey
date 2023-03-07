import type PolykeyClient from '../../PolykeyClient';
import type { NodeId } from '../../ids/types';
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
        const { clientManifest } = await import('../../client/handlers');
        const nodesUtils = await import('../../nodes/utils');
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
        let pkClient: PolykeyClient<typeof clientManifest>;
        this.exitHandlers.handlers.push(async () => {
          if (pkClient != null) await pkClient.stop();
        });
        try {
          pkClient = await PolykeyClient.createPolykeyClient({
            nodePath: options.nodePath,
            nodeId: clientOptions.nodeId,
            host: clientOptions.clientHost,
            port: clientOptions.clientPort,
            manifest: clientManifest,
            logger: this.logger.getChild(PolykeyClient.name),
          });
          await binUtils.retryAuthentication(
            (auth) =>
              pkClient.rpcClient.methods.vaultsPull({
                metadata: auth,
                nodeIdEncoded:
                  targetNodeId != null
                    ? nodesUtils.encodeNodeId(targetNodeId)
                    : undefined,
                nameOrId: vaultNameOrId,
                pullVault: options.pullVault,
              }),
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
