import type PolykeyClient from '../../PolykeyClient';
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
      const utilsPB = await import('../../proto/js/polykey/v1/utils/utils_pb');
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
        const emptyMessage = new utilsPB.EmptyMessage();
        let output: any;
        const gestalts = await binUtils.retryAuthentication(async (auth) => {
          const gestalts: Array<any> = [];
          const stream = pkClient.grpcClient.gestaltsGestaltList(
            emptyMessage,
            auth,
          );
          for await (const val of stream) {
            const gestalt = JSON.parse(val.getName());
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
            const nodeMessage = new nodesPB.Node();
            nodeMessage.setNodeId(newGestalt.nodes[0].nodeId);
            const actionsMessage = await binUtils.retryAuthentication(
              (auth) =>
                pkClient.grpcClient.gestaltsActionsGetByNode(nodeMessage, auth),
              meta,
            );
            const actionList = actionsMessage.getActionList();
            if (actionList.length === 0) newGestalt.permissions = null;
            else newGestalt.permissions = actionList;
            gestalts.push(newGestalt);
          }
          return gestalts;
        }, meta);
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
      }
    });
  }
}

export default CommandList;
