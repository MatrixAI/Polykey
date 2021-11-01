import type { Metadata } from '@grpc/grpc-js';

import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandPing extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('ping');
    this.description("Ping a Node to check if it's Online");
    this.argument('<nodeId>', 'Id of the node to ping');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (nodeId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const nodesPB = await import('../../proto/js/polykey/v1/nodes/nodes_pb');
      const CLIErrors = await import('../errors');
      const nodesErrors = await import('../../nodes/errors');

      const clientOptions = await binProcessors.processClientOptions(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );

      let pkClient: PolykeyClient | undefined;
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

        const meta = await binProcessors.processAuthentication(
          options.passwordFile,
          this.fs,
        );
        const grpcClient = pkClient.grpcClient;
        const nodeMessage = new nodesPB.Node();
        nodeMessage.setNodeId(nodeId);
        let statusMessage;
        let error;
        try {
          statusMessage = await binUtils.retryAuthentication(
            (auth?: Metadata) => grpcClient.nodesPing(nodeMessage, auth),
            meta,
          );
        } catch (err) {
          if (err instanceof nodesErrors.ErrorNodeGraphNodeNotFound) {
            error = new CLIErrors.ErrorNodePingFailed(
              `Failed to resolve node ID ${nodeId} to an address.`,
            );
          } else {
            throw err;
          }
        }

        const status = { success: false, message: '' };
        status.success = statusMessage ? statusMessage.getSuccess() : false;
        if (!status.success && !error)
          error = new CLIErrors.ErrorNodePingFailed('No response received');

        if (status.success) status.message = 'Node is Active.';
        else status.message = error.message;

        const output: any =
          options.format === 'json' ? status : [status.message];

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: output,
          }),
        );

        if (error != null) throw error;
      } finally {
        if (pkClient != null) await pkClient.stop();
      }
    });
  }
}

export default CommandPing;
