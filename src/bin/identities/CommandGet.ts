import type PolykeyClient from '../../PolykeyClient';
import type WebSocketClient from '../../websockets/WebSocketClient';
import type { GestaltId } from '../../gestalts/types';
import type { GestaltMessage } from '../../client/handlers/types';
import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../utils/options';
import * as binUtils from '../utils';
import * as parsers from '../utils/parsers';
import * as binProcessors from '../utils/processors';

class CommandGet extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('get');
    this.description(
      'Gets a Gestalt with a Node or Identity ID from the Gestalt Graph',
    );
    this.argument(
      '<gestaltId>',
      'Node ID or `Provider ID:Identity ID`',
      parsers.parseGestaltId,
    );
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (gestaltId: GestaltId, options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const { default: WebSocketClient } = await import(
        '../../websockets/WebSocketClient'
      );
      const utils = await import('../../utils');
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
        let res: GestaltMessage | null = null;
        const [type, id] = gestaltId;
        switch (type) {
          case 'node':
            {
              // Getting from node
              res = await binUtils.retryAuthentication(
                (auth) =>
                  pkClient.rpcClientClient.methods.gestaltsGestaltGetByNode({
                    metadata: auth,
                    nodeIdEncoded: nodesUtils.encodeNodeId(id),
                  }),
                auth,
              );
            }
            break;
          case 'identity':
            {
              // Getting from identity.
              res = await binUtils.retryAuthentication(
                (auth) =>
                  pkClient.rpcClientClient.methods.gestaltsGestaltGetByIdentity(
                    {
                      metadata: auth,
                      providerId: id[0],
                      identityId: id[1],
                    },
                  ),
                auth,
              );
            }
            break;
          default:
            utils.never();
        }
        const gestalt = res!.gestalt;
        let output: any = gestalt;
        if (options.format !== 'json') {
          // Creating a list.
          output = [];
          // Listing nodes.
          for (const nodeKey of Object.keys(gestalt.nodes)) {
            const node = gestalt.nodes[nodeKey];
            output.push(`${node.nodeId}`);
          }
          // Listing identities
          for (const identityKey of Object.keys(gestalt.identities)) {
            const identity = gestalt.identities[identityKey];
            output.push(`${identity.providerId}:${identity.identityId}`);
          }
        }
        process.stdout.write(
          binUtils.outputFormatter({
            type: options.format === 'json' ? 'json' : 'list',
            data: output,
          }),
        );
      } finally {
        if (pkClient! != null) await pkClient.stop();
        if (webSocketClient! != null) await webSocketClient.destroy();
      }
    });
  }
}

export default CommandGet;
