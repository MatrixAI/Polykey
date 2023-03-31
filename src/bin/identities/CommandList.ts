import type PolykeyClient from '../../PolykeyClient';
import type WebSocketClient from '../../websockets/WebSocketClient';
import CommandPolykey from '../CommandPolykey';
import * as binOptions from '../utils/options';
import * as binUtils from '../utils';
import * as binProcessors from '../utils/processors';

class CommandList extends CommandPolykey {
  constructor(...args: ConstructorParameters<typeof CommandPolykey>) {
    super(...args);
    this.name('list');
    this.description('List all the Gestalts in the Gestalt Graph');
    this.addOption(binOptions.nodeId);
    this.addOption(binOptions.clientHost);
    this.addOption(binOptions.clientPort);
    this.action(async (options) => {
      const { default: PolykeyClient } = await import('../../PolykeyClient');
      const { default: WebSocketClient } = await import(
        '../../websockets/WebSocketClient'
      );
      const { clientManifest } = await import(
        '../../client/handlers/clientManifest'
      );
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
        let output: any;
        const gestalts = await binUtils.retryAuthentication(async (auth) => {
          const gestalts: Array<any> = [];
          const stream = await pkClient.rpcClient.methods.gestaltsGestaltList({
            metadata: auth,
          });
          for await (const gestaltMessage of stream) {
            const gestalt = gestaltMessage.gestalt;
            const newGestalt: any = {
              permissions: [],
              nodes: [],
              identities: [],
            };
            for (const node of Object.keys(gestalt.nodes)) {
              const nodeInfo = gestalt.nodes[node];
              newGestalt.nodes.push({ nodeId: nodeInfo.nodeId });
            }
            for (const identity of Object.keys(gestalt.identities)) {
              const identityInfo = gestalt.identities[identity];
              newGestalt.identities.push({
                providerId: identityInfo.providerId,
                identityId: identityInfo.identityId,
              });
            }
            // Getting the permissions for the gestalt.
            const actionsMessage = await binUtils.retryAuthentication(
              (auth) =>
                pkClient.rpcClient.methods.gestaltsActionsGetByNode({
                  metadata: auth,
                  nodeIdEncoded: newGestalt.nodes[0].nodeId,
                }),
              auth,
            );
            const actionList = actionsMessage.actionsList;
            if (actionList.length === 0) newGestalt.permissions = null;
            else newGestalt.permissions = actionList;
            gestalts.push(newGestalt);
          }
          return gestalts;
        }, auth);
        output = gestalts;
        if (options.format !== 'json') {
          // Convert to a human-readable list.
          output = [];
          let count = 1;
          for (const gestalt of gestalts) {
            output.push(`gestalt ${count}`);
            output.push(`permissions: ${gestalt.permissions ?? 'None'}`);
            // Listing nodes
            for (const node of gestalt.nodes) {
              output.push(`${node.id}`);
            }
            // Listing identities
            for (const identity of gestalt.identities) {
              output.push(`${identity.providerId}:${identity.identityId}`);
            }
            output.push('');
            count++;
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

export default CommandList;
