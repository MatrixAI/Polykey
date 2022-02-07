import type { Metadata } from '@grpc/grpc-js';

import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandScan extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('scan');
    this.description('Scans a node to reveal their vaults');
    this.argument('<nodeId>', 'Id of the node to scan');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (nodeId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const nodesPB = await import('../../proto/js/polykey/v1/nodes/nodes_pb');

      const clientOptions = await binProcessors.processClientOptions(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );
      const client = await PolykeyClient.createPolykeyClient({
        nodeId: clientOptions.nodeId,
        host: clientOptions.clientHost,
        port: clientOptions.clientPort,
        logger: this.logger.getChild(PolykeyClient.name),
      });

      const meta = await binProcessors.processAuthentication(
        options.passwordFile,
        this.fs,
      );

      try {
        const grpcClient = client.grpcClient;
        const nodeMessage = new nodesPB.Node();
        nodeMessage.setNodeId(nodeId);

        const data = await binUtils.retryAuthentication(
          async (meta: Metadata) => {
            const data: Array<string> = [];
            const stream = grpcClient.vaultsScan(nodeMessage, meta);
            for await (const vault of stream) {
              data.push(`${vault.getVaultName()}\t\t${vault.getVaultId()}`);
            }
            return data;
          },
          meta,
        );

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: data,
          }),
        );
      } finally {
        await client.stop();
      }
    });
  }
}

export default CommandScan;
