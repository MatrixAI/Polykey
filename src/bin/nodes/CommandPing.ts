import type PolykeyClient from '../../PolykeyClient';
import type WebSocketClient from '../../websockets/WebSocketClient';
import type { NodeId } from '../../ids/types';
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
      const { default: WebSocketClient } = await import(
        '../../websockets/WebSocketClient'
      );
      const { clientManifest } = await import(
        '../../client/handlers/clientManifest'
      );
      const nodesUtils = await import('../../nodes/utils');
      const clientOptions = await binProcessors.processClientOptions(
        options.nodePath,
        options.nodeId,
        options.clientHost,
        options.clientPort,
        this.fs,
        this.logger.getChild(binProcessors.processClientOptions.name),
      );
      const auth = await binProcessors.processAuthentication(
        options.passwordFile,
        this.fs,
      );
      let webSocketClient: WebSocketClient;
      let pkClient: PolykeyClient<typeof clientManifest>;
      this.exitHandlers.handlers.push(async () => {
        if (pkClient != null) await pkClient.stop();
        if (webSocketClient != null) await webSocketClient.destroy(true);
      });
      try {
        webSocketClient = await WebSocketClient.createWebSocketClient({
          expectedNodeIds: [clientOptions.nodeId],
          host: clientOptions.clientHost,
          port: clientOptions.clientPort,
          logger: this.logger.getChild(WebSocketClient.name),
        });
        pkClient = await PolykeyClient.createPolykeyClient({
          streamFactory: (ctx) => webSocketClient.startConnection(ctx),
          nodePath: options.nodePath,
          manifest: clientManifest,
          logger: this.logger.getChild(PolykeyClient.name),
        });
        let error;
        const statusMessage = await binUtils.retryAuthentication(
          (auth) =>
            pkClient.rpcClient.methods.nodesPing({
              metadata: auth,
              nodeIdEncoded: nodesUtils.encodeNodeId(nodeId),
            }),
          auth,
        );
        const status = { success: false, message: '' };
        status.success = statusMessage ? statusMessage.success : false;
        if (!status.success && !error) {
          error = new binErrors.ErrorCLINodePingFailed('No response received');
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
        if (webSocketClient! != null) await webSocketClient.destroy();
      }
    });
  }
}

export default CommandPing;
