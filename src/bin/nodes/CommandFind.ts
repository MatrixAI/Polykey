import type { Host, Port } from '../../network/types';

import type PolykeyClient from '../../PolykeyClient';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';

class CommandFind extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('find');
    this.description('Attempt to Find a Node');
    this.argument('<nodeId>', 'Id of the node to find');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (nodeId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const nodesPB = await import('../../proto/js/polykey/v1/nodes/nodes_pb');
      const networkUtils = await import('../../network/utils');
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
        const result = {
          success: false,
          message: '',
          id: '',
          host: '',
          port: 0,
        };
        try {
          const response = await binUtils.retryAuthentication(
            (auth) => grpcClient.nodesFind(nodeMessage, auth),
            meta,
          );

          result.success = true;
          result.id = response.getNodeId();
          result.host = response.getAddress()!.getHost();
          result.port = response.getAddress()!.getPort();
          result.message = `Found node at ${networkUtils.buildAddress(
            result.host as Host,
            result.port as Port,
          )}`;
        } catch (err) {
          if (!(err instanceof nodesErrors.ErrorNodeGraphNodeNotFound))
            throw err;
          // Else failed to find the node.
          result.success = false;
          result.id = nodeId;
          result.host = '';
          result.port = 0;
          result.message = `Failed to find node ${result.id}`;
        }

        let output: any = result;
        if (options.format === 'human') output = [result.message];

        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: output,
          }),
        );
        // Like ping it should error when failing to find node for automation reasons.
        if (!result.success)
          throw new CLIErrors.ErrorNodeFindFailed(result.message);
      } finally {
        if (pkClient != null) await pkClient.stop();
      }
    });
  }
}

export default CommandFind;
