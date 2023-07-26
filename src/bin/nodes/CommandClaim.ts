import type PolykeyClient from '../../PolykeyClient';
import type WebSocketClient from '../../websockets/WebSocketClient';
import type { NodeId } from '../../ids/types';
import CommandPolykey from '../CommandPolykey';
import * as binUtils from '../utils';
import * as binOptions from '../utils/options';
import * as binProcessors from '../utils/processors';
import * as binParsers from '../utils/parsers';

class CommandClaim extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('claim');
    this.description('Claim another Keynode');
    this.argument(
      '<nodeId>',
      'Id of the node to claim',
      binParsers.parseNodeId,
    );
    this.option(
      '-f, --force-invite',
      '(optional) Flag to force a Gestalt Invitation to be sent rather than a node claim.',
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (nodeId: NodeId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const { default: WebSocketClient } = await import(
        '../../websockets/WebSocketClient'
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
      let pkClient: PolykeyClient;
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
          logger: this.logger.getChild(PolykeyClient.name),
        });
        const response = await binUtils.retryAuthentication(
          (auth) =>
            pkClient.rpcClientClient.methods.nodesClaim({
              metadata: auth,
              nodeIdEncoded: nodesUtils.encodeNodeId(nodeId),
              forceInvite: options.forceInvite,
            }),
          auth,
        );
        const claimed = response.success;
        if (claimed) {
          process.stdout.write(
            binUtils.outputFormatter({
              type: options.format === 'json' ? 'json' : 'list',
              data: [
                `Successfully generated a cryptolink claim on Keynode with ID ${nodesUtils.encodeNodeId(
                  nodeId,
                )}`,
              ],
            }),
          );
        } else {
          process.stdout.write(
            binUtils.outputFormatter({
              type: options.format === 'json' ? 'json' : 'list',
              data: [
                `Successfully sent Gestalt Invite notification to Keynode with ID ${nodesUtils.encodeNodeId(
                  nodeId,
                )}`,
              ],
            }),
          );
        }
      } finally {
        if (pkClient! != null) await pkClient.stop();
        if (webSocketClient! != null) await webSocketClient.destroy();
      }
    });
  }
}

export default CommandClaim;
