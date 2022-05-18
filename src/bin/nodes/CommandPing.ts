import type PolykeyClient from '../../PolykeyClient';
import type { NodeId } from '../../nodes/types';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';
import * as binParsers from '../utils/parsers';
import * as binErrors from '../errors';

class CommandPing extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('ping');
    this.description("Ping a Node to check if it's Online");
    this.argument('<nodeId>', 'Id of the node to ping', binParsers.parseNodeId);
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (nodeId: NodeId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const nodesUtils = await import('../../nodes/utils');
      const nodesErrors = await import('../../nodes/errors');
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
        const nodeMessage = new nodesPB.Node();
        nodeMessage.setNodeId(nodesUtils.encodeNodeId(nodeId));
        let statusMessage;
        let error;
        try {
          statusMessage = await binUtils.retryAuthentication(
            (auth) => pkClient.grpcClient.nodesPing(nodeMessage, auth),
            meta,
          );
        } catch (err) {
          if (err.cause instanceof nodesErrors.ErrorNodeGraphNodeIdNotFound) {
            error = new binErrors.ErrorNodePingFailed(
              `Failed to resolve node ID ${nodesUtils.encodeNodeId(
                nodeId,
              )} to an address.`,
              { cause: err },
            );
          } else {
            throw err;
          }
        }
        const status = { success: false, message: '' };
        status.success = statusMessage ? statusMessage.getSuccess() : false;
        if (!status.success && !error) {
          error = new binErrors.ErrorNodePingFailed('No response received');
        }
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
        if (pkClient! != null) await pkClient.stop();
      }
    });
  }
}

export default CommandPing;
